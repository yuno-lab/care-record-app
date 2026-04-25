const form = document.getElementById('recordForm');
const recordsList = document.getElementById('recordsList');
const recordCountMessage = document.getElementById('recordCountMessage');
const personSelect = document.getElementById('personId');
const filterPersonId = document.getElementById('filterPersonId');
const filterDateFrom = document.getElementById('filterDateFrom');
const filterDateTo = document.getElementById('filterDateTo');
const sortOrder = document.getElementById('sortOrder');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const exportRecordsBtn = document.getElementById('exportRecordsBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const printRecordsBtn = document.getElementById('printRecordsBtn');
const importRecordsFile = document.getElementById('importRecordsFile');

const RECORDS_KEY = 'careRecords';
const NAMES_KEY = 'careNames';

let editingIndex = null;

function safeParse(jsonText, fallbackValue) {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallbackValue;
  }
}

function extractNameArray(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (rawValue && typeof rawValue === 'object') {
    if (Array.isArray(rawValue.names)) return rawValue.names;
    if (typeof rawValue.name === 'string') return [rawValue];
  }
  return [];
}

function normalizeNames(rawValue) {
  const sourceArray = extractNameArray(rawValue);
  const normalized = [];
  sourceArray.forEach((item) => {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) normalized.push({ id: `legacy_${trimmed}`, name: trimmed });
      return;
    }
    if (item && typeof item === 'object') {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `legacy_${name}`;
      if (name) normalized.push({ id, name });
    }
  });
  const uniqueById = new Map();
  normalized.forEach((item) => {
    if (!uniqueById.has(item.id)) uniqueById.set(item.id, item);
  });
  const uniqueByName = new Map();
  Array.from(uniqueById.values()).forEach((item) => {
    if (!uniqueByName.has(item.name)) uniqueByName.set(item.name, item);
  });
  return Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function normalizeRecords(rawValue) {
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .filter((record) => record && typeof record === 'object')
    .map((record) => ({
      date: typeof record.date === 'string' ? record.date : '',
      personId: typeof record.personId === 'string' ? record.personId : '',
      personName:
        typeof record.personName === 'string'
          ? record.personName
          : typeof record.name === 'string'
            ? record.name
            : '',
      meal: typeof record.meal === 'string' ? record.meal : '',
      water: typeof record.water === 'string' || typeof record.water === 'number' ? String(record.water) : '',
      medicine: typeof record.medicine === 'string' ? record.medicine : '',
      toilet: typeof record.toilet === 'string' ? record.toilet : '',
      temperature:
        typeof record.temperature === 'string' || typeof record.temperature === 'number'
          ? String(record.temperature)
          : '',
      memo: typeof record.memo === 'string' ? record.memo : ''
    }));
}

function getNames() {
  const raw = localStorage.getItem(NAMES_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
  return normalizeNames(parsed);
}

function saveNames(names) {
  localStorage.setItem(NAMES_KEY, JSON.stringify(normalizeNames(names)));
}

function getRecords() {
  const raw = localStorage.getItem(RECORDS_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
  return normalizeRecords(parsed);
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(normalizeRecords(records)));
}

function findPersonNameById(personId) {
  const matched = getNames().find((item) => item.id === personId);
  return matched ? matched.name : '';
}

function makeRecordKey(record) {
  const personId = typeof record.personId === 'string' ? record.personId.trim() : '';
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  return `${personId}__${date}`;
}

function hasDuplicateRecord(personId, date, excludeIndex = null) {
  const targetKey = `${String(personId).trim()}__${String(date).trim()}`;
  return getRecords().some((record, index) => {
    if (excludeIndex !== null && index === excludeIndex) return false;
    return makeRecordKey(record) === targetKey;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPersonOptions(selectElement, selectedId = '', includeAllOption = false) {
  if (!selectElement) return;
  const names = getNames();
  selectElement.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = includeAllOption ? 'すべて' : '選択してください';
  selectElement.appendChild(defaultOption);
  names.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    selectElement.appendChild(option);
  });
  if (names.some((item) => item.id === selectedId)) selectElement.value = selectedId;
}

function buildPersonOptionsHtml(selectedId) {
  const names = getNames();
  const options = [`<option value=""${selectedId ? '' : ' selected'}>選択してください</option>`];
  names.forEach((item) => {
    const selected = item.id === selectedId ? ' selected' : '';
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.name)}</option>`);
  });
  return options.join('');
}

function getFilteredRecordsWithIndex() {
  const records = getRecords();
  const personId = filterPersonId?.value || '';
  const from = filterDateFrom?.value || '';
  const to = filterDateTo?.value || '';
  const order = sortOrder?.value || 'desc';

  const filtered = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => {
      if (personId && record.personId !== personId) return false;
      if (from && record.date < from) return false;
      if (to && record.date > to) return false;
      return true;
    });

  filtered.sort((a, b) => {
    const result = String(a.record.date || '').localeCompare(String(b.record.date || ''));
    return order === 'asc' ? result : -result;
  });

  return filtered;
}

function renderRecords() {
  if (!recordsList) return;
  const filteredRecords = getFilteredRecordsWithIndex();
  recordsList.innerHTML = '';

  if (recordCountMessage) recordCountMessage.textContent = `表示中: ${filteredRecords.length}件 / 全体: ${getRecords().length}件`;

  if (filteredRecords.length === 0) {
    recordsList.innerHTML = '<p>表示できる記録はありません。</p>';
    return;
  }

  filteredRecords.forEach(({ record, index }) => {
    const displayName = record.personName || findPersonNameById(record.personId) || '-';
    const card = document.createElement('div');
    card.className = 'record-card';

    if (editingIndex === index) {
      card.innerHTML = `
        <p><strong>編集中の記録</strong></p>
        <div class="edit-form">
          <div class="form-group">
            <label for="edit-date-${index}">日付</label>
            <input type="date" id="edit-date-${index}" value="${escapeHtml(record.date || '')}">
          </div>
          <div class="form-group">
            <label for="edit-personId-${index}">対象者名</label>
            <select id="edit-personId-${index}">
              ${buildPersonOptionsHtml(record.personId || '')}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-meal-${index}">食事</label>
            <select id="edit-meal-${index}">
              <option value="">選択してください</option>
              <option value="完食"${record.meal === '完食' ? ' selected' : ''}>完食</option>
              <option value="半分"${record.meal === '半分' ? ' selected' : ''}>半分</option>
              <option value="少量"${record.meal === '少量' ? ' selected' : ''}>少量</option>
              <option value="未摂取"${record.meal === '未摂取' ? ' selected' : ''}>未摂取</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-water-${index}">水分量(ml)</label>
            <input type="number" id="edit-water-${index}" min="0" value="${escapeHtml(record.water || '')}">
          </div>
          <div class="form-group">
            <label for="edit-medicine-${index}">服薬</label>
            <select id="edit-medicine-${index}">
              <option value="">選択してください</option>
              <option value="済"${record.medicine === '済' ? ' selected' : ''}>済</option>
              <option value="未"${record.medicine === '未' ? ' selected' : ''}>未</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-toilet-${index}">排泄</label>
            <select id="edit-toilet-${index}">
              <option value="">選択してください</option>
              <option value="あり"${record.toilet === 'あり' ? ' selected' : ''}>あり</option>
              <option value="なし"${record.toilet === 'なし' ? ' selected' : ''}>なし</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-temperature-${index}">体温(℃)</label>
            <input type="number" id="edit-temperature-${index}" step="0.1" value="${escapeHtml(record.temperature || '')}">
          </div>
          <div class="form-group">
            <label for="edit-memo-${index}">メモ</label>
            <textarea id="edit-memo-${index}" rows="4">${escapeHtml(record.memo || '')}</textarea>
          </div>
          <div class="action-buttons no-print">
            <button type="button" class="save-edit-btn" data-index="${index}">保存</button>
            <button type="button" class="cancel-edit-btn" data-index="${index}">キャンセル</button>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <p><strong>日付:</strong> ${escapeHtml(record.date || '-')}</p>
        <p><strong>対象者名:</strong> ${escapeHtml(displayName)}</p>
        <p><strong>食事:</strong> ${escapeHtml(record.meal || '-')}</p>
        <p><strong>水分量:</strong> ${escapeHtml(record.water || '-')} ml</p>
        <p><strong>服薬:</strong> ${escapeHtml(record.medicine || '-')}</p>
        <p><strong>排泄:</strong> ${escapeHtml(record.toilet || '-')}</p>
        <p><strong>体温:</strong> ${escapeHtml(record.temperature || '-')} ℃</p>
        <p><strong>メモ:</strong> ${escapeHtml(record.memo || '-')}</p>
        <div class="action-buttons no-print">
          <button type="button" class="edit-btn" data-index="${index}">編集</button>
          <button type="button" class="delete-btn" data-index="${index}">削除</button>
        </div>
      `;
    }

    recordsList.appendChild(card);
  });

  document.querySelectorAll('.edit-btn').forEach((button) => button.addEventListener('click', (e) => startEdit(Number(e.target.dataset.index))));
  document.querySelectorAll('.save-edit-btn').forEach((button) => button.addEventListener('click', (e) => saveEdit(Number(e.target.dataset.index))));
  document.querySelectorAll('.cancel-edit-btn').forEach((button) => button.addEventListener('click', () => cancelEdit()));
  document.querySelectorAll('.delete-btn').forEach((button) => button.addEventListener('click', (e) => deleteRecord(Number(e.target.dataset.index))));
}

function startEdit(index) {
  editingIndex = index;
  renderRecords();
}

function cancelEdit() {
  if (!window.confirm('編集内容を破棄してキャンセルしてよろしいですか？')) return;
  editingIndex = null;
  renderRecords();
}

function saveEdit(index) {
  const records = getRecords();
  const date = document.getElementById(`edit-date-${index}`)?.value || '';
  const personId = document.getElementById(`edit-personId-${index}`)?.value || '';
  const meal = document.getElementById(`edit-meal-${index}`)?.value || '';
  const water = document.getElementById(`edit-water-${index}`)?.value || '';
  const medicine = document.getElementById(`edit-medicine-${index}`)?.value || '';
  const toilet = document.getElementById(`edit-toilet-${index}`)?.value || '';
  const temperature = document.getElementById(`edit-temperature-${index}`)?.value || '';
  const memo = document.getElementById(`edit-memo-${index}`)?.value || '';

  if (!date) return alert('日付を入力してください。');
  if (!personId) return alert('対象者名を選択してください。');
  const personName = findPersonNameById(personId);
  if (!personName) return alert('選択された対象者名が見つかりません。対象者名管理ページを確認してください。');
  if (hasDuplicateRecord(personId, date, index)) return alert('同じ対象者名・同じ日付の保存済み記録がすでに存在するため、保存できません。');
  if (!window.confirm('この内容で保存してよろしいですか？')) return;

  records[index] = { date, personId, personName, meal, water, medicine, toilet, temperature, memo };
  saveRecords(records);
  editingIndex = null;
  renderRecords();
}

function deleteRecord(index) {
  if (!window.confirm('この記録を削除してよろしいですか？')) return;
  const records = getRecords();
  records.splice(index, 1);
  saveRecords(records);
  if (editingIndex === index) editingIndex = null;
  else if (editingIndex !== null && editingIndex > index) editingIndex -= 1;
  renderRecords();
}

function buildExportData() {
  return {
    exportedAt: new Date().toISOString(),
    app: 'care-record-app',
    version: 5,
    names: getNames(),
    records: getRecords()
  };
}

function exportAllData() {
  const exportData = buildExportData();
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `care-record-app-data-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function exportFilteredCsv() {
  const rows = getFilteredRecordsWithIndex().map(({ record }) => {
    const personName = record.personName || findPersonNameById(record.personId) || '';
    return [record.date, personName, record.meal, record.water, record.medicine, record.toilet, record.temperature, record.memo];
  });
  const header = ['日付', '対象者名', '食事', '水分量(ml)', '服薬', '排泄', '体温(℃)', 'メモ'];
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `care-records-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mergeNames(existingNames, importedNames) {
  const byId = new Map();
  normalizeNames(existingNames).forEach((item) => byId.set(item.id, item));
  normalizeNames(importedNames).forEach((item) => byId.set(item.id, item));
  return normalizeNames(Array.from(byId.values()));
}

function importAllData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const importedNames = normalizeNames(imported.names || []);
      const importedRecords = normalizeRecords(imported.records || []);
      saveNames(mergeNames(getNames(), importedNames));
      const existingRecords = getRecords();
      const importedKeys = new Set(importedRecords.map((record) => makeRecordKey(record)));
      const filteredExistingRecords = existingRecords.filter((record) => !importedKeys.has(makeRecordKey(record)));
      saveRecords([...importedRecords, ...filteredExistingRecords]);
      editingIndex = null;
      refreshPageData();
      alert('データをインポートしました。対象者名一覧をマージし、personId と date が一致する記録はインポート内容で上書きしました。');
    } catch (error) {
      console.error(error);
      alert('JSON の読み込みに失敗しました。');
    }
  };
  reader.readAsText(file);
}

function refreshPageData() {
  renderPersonOptions(personSelect, personSelect?.value || '', false);
  renderPersonOptions(filterPersonId, filterPersonId?.value || '', true);
  renderRecords();
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const personId = personSelect?.value || '';
    const date = document.getElementById('date')?.value || '';
    if (!date) return alert('日付を入力してください。');
    if (!personId) return alert('対象者名を選択してください。');
    if (hasDuplicateRecord(personId, date)) return alert('同じ対象者名・同じ日付の保存済み記録がすでに存在するため、保存できません。');
    const personName = findPersonNameById(personId);
    if (!personName) return alert('選択された対象者名が見つかりません。対象者名管理ページを確認してください。');
    const record = {
      date,
      personId,
      personName,
      meal: document.getElementById('meal')?.value || '',
      water: document.getElementById('water')?.value || '',
      medicine: document.getElementById('medicine')?.value || '',
      toilet: document.getElementById('toilet')?.value || '',
      temperature: document.getElementById('temperature')?.value || '',
      memo: document.getElementById('memo')?.value || ''
    };
    const records = getRecords();
    records.unshift(record);
    saveRecords(records);
    form.reset();
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    refreshPageData();
  });
}

if (applyFilterBtn) applyFilterBtn.addEventListener('click', renderRecords);
if (clearFilterBtn) {
  clearFilterBtn.addEventListener('click', () => {
    if (filterPersonId) filterPersonId.value = '';
    if (filterDateFrom) filterDateFrom.value = '';
    if (filterDateTo) filterDateTo.value = '';
    if (sortOrder) sortOrder.value = 'desc';
    renderRecords();
  });
}
if (exportRecordsBtn) exportRecordsBtn.addEventListener('click', exportAllData);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportFilteredCsv);
if (printRecordsBtn) printRecordsBtn.addEventListener('click', () => window.print());
if (importRecordsFile) {
  importRecordsFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importAllData(file);
    e.target.value = '';
  });
}

window.addEventListener('pageshow', refreshPageData);
window.addEventListener('focus', refreshPageData);
window.addEventListener('storage', (e) => {
  if (e.key === NAMES_KEY || e.key === RECORDS_KEY) {
    editingIndex = null;
    refreshPageData();
  }
});

const dateInput = document.getElementById('date');
if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
refreshPageData();
