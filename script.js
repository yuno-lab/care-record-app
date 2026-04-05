const form = document.getElementById('recordForm');
const recordsList = document.getElementById('recordsList');
const personSelect = document.getElementById('personId');
const exportRecordsBtn = document.getElementById('exportRecordsBtn');
const importRecordsFile = document.getElementById('importRecordsFile');

const RECORDS_KEY = 'careRecords';
const NAMES_KEY = 'careNames';

function safeParse(jsonText, fallbackValue) {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallbackValue;
  }
}

function extractNameArray(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  if (rawValue && typeof rawValue === 'object') {
    if (Array.isArray(rawValue.names)) {
      return rawValue.names;
    }

    if (typeof rawValue.name === 'string') {
      return [rawValue];
    }
  }

  return [];
}

function normalizeNames(rawValue) {
  const sourceArray = extractNameArray(rawValue);
  const normalized = [];

  sourceArray.forEach((item) => {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) {
        normalized.push({
          id: `legacy_${trimmed}`,
          name: trimmed
        });
      }
      return;
    }

    if (item && typeof item === 'object') {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `legacy_${name}`;

      if (name) {
        normalized.push({ id, name });
      }
    }
  });

  const uniqueMap = new Map();

  normalized.forEach((item) => {
    if (!uniqueMap.has(item.name)) {
      uniqueMap.set(item.name, item);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ja')
  );
}

function getNames() {
  const raw = localStorage.getItem(NAMES_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
  const normalized = normalizeNames(parsed);

  console.log('careNames raw:', raw);
  console.log('careNames parsed:', parsed);
  console.log('careNames normalized:', normalized);

  return normalized;
}

function saveNames(names) {
  const normalized = normalizeNames(names);
  localStorage.setItem(NAMES_KEY, JSON.stringify(normalized));
}

function getRecords() {
  const raw = localStorage.getItem(RECORDS_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
  return Array.isArray(parsed) ? parsed : [];
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function findPersonNameById(personId) {
  const names = getNames();
  const matched = names.find((item) => item.id === personId);
  return matched ? matched.name : '';
}

function renderNameOptions() {
  if (!personSelect) {
    console.error('personId の select 要素が見つかりません。index.html の id を確認してください。');
    return;
  }

  const names = getNames();
  const currentValue = personSelect.value;

  personSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '選択してください';
  personSelect.appendChild(defaultOption);

  names.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    personSelect.appendChild(option);
  });

  if (names.some((item) => item.id === currentValue)) {
    personSelect.value = currentValue;
  }

  console.log('personSelect options count:', personSelect.options.length);
  console.log('personSelect innerHTML:', personSelect.innerHTML);
}

function renderRecords() {
  if (!recordsList) {
    return;
  }

  const records = getRecords();
  recordsList.innerHTML = '';

  if (records.length === 0) {
    recordsList.innerHTML = '<p>まだ記録はありません。</p>';
    return;
  }

  records.forEach((record, index) => {
    const displayName =
      record.personName ||
      findPersonNameById(record.personId) ||
      record.name ||
      '-';

    const card = document.createElement('div');
    card.className = 'record-card';

    card.innerHTML = `
      <p><strong>日付:</strong> ${record.date || '-'}</p>
      <p><strong>対象者名:</strong> ${displayName}</p>
      <p><strong>食事:</strong> ${record.meal || '-'}</p>
      <p><strong>水分量:</strong> ${record.water || '-'} ml</p>
      <p><strong>服薬:</strong> ${record.medicine || '-'}</p>
      <p><strong>排泄:</strong> ${record.toilet || '-'}</p>
      <p><strong>体温:</strong> ${record.temperature || '-'} ℃</p>
      <p><strong>メモ:</strong> ${record.memo || '-'}</p>
      <button class="delete-btn" data-index="${index}">削除</button>
    `;

    recordsList.appendChild(card);
  });

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      const index = Number(e.target.dataset.index);
      deleteRecord(index);
    });
  });
}

function deleteRecord(index) {
  const records = getRecords();
  records.splice(index, 1);
  saveRecords(records);
  renderRecords();
}

function exportRecords() {
  const records = getRecords();

  const exportData = {
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records
  };

  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];

  a.href = url;
  a.download = `care-records-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importRecords(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      if (!imported.records || !Array.isArray(imported.records)) {
        alert('インポートファイルの形式が正しくありません。');
        return;
      }

      saveRecords(imported.records);
      renderRecords();
      alert('保存済み記録をインポートしました。');
    } catch (error) {
      console.error(error);
      alert('JSON の読み込みに失敗しました。');
    }
  };

  reader.readAsText(file);
}

function refreshPageData() {
  renderNameOptions();
  renderRecords();
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!personSelect) {
      alert('対象者名プルダウンが見つかりません。');
      return;
    }

    const personId = personSelect.value;
    if (!personId) {
      alert('対象者名を選択してください。');
      return;
    }

    const personName = findPersonNameById(personId);
    if (!personName) {
      alert('選択された対象者名が見つかりません。対象者名管理ページを確認してください。');
      refreshPageData();
      return;
    }

    const record = {
      date: document.getElementById('date')?.value || '',
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
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    refreshPageData();
  });
}

if (exportRecordsBtn) {
  exportRecordsBtn.addEventListener('click', exportRecords);
}

if (importRecordsFile) {
  importRecordsFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importRecords(file);
    e.target.value = '';
  });
}

window.addEventListener('pageshow', refreshPageData);
window.addEventListener('focus', refreshPageData);

window.addEventListener('storage', (e) => {
  if (e.key === NAMES_KEY || e.key === RECORDS_KEY) {
    refreshPageData();
  }
});

const dateInput = document.getElementById('date');
if (dateInput) {
  dateInput.value = new Date().toISOString().split('T')[0];
}

refreshPageData();