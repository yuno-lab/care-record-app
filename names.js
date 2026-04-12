const nameForm = document.getElementById('nameForm');
const personNameInput = document.getElementById('personName');
const namesList = document.getElementById('namesList');
const exportAllDataBtn = document.getElementById('exportAllDataBtn');
const importAllDataFile = document.getElementById('importAllDataFile');

const NAMES_KEY = 'careNames';
const RECORDS_KEY = 'careRecords';

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

  const uniqueById = new Map();
  normalized.forEach((item) => {
    if (!uniqueById.has(item.id)) {
      uniqueById.set(item.id, item);
    }
  });

  const uniqueByName = new Map();
  Array.from(uniqueById.values()).forEach((item) => {
    if (!uniqueByName.has(item.name)) {
      uniqueByName.set(item.name, item);
    }
  });

  return Array.from(uniqueByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ja')
  );
}

function normalizeRecords(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

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
  const normalized = normalizeNames(names);
  localStorage.setItem(NAMES_KEY, JSON.stringify(normalized));
}

function getRecords() {
  const raw = localStorage.getItem(RECORDS_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
  return normalizeRecords(parsed);
}

function saveRecords(records) {
  const normalized = normalizeRecords(records);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(normalized));
}

function renderNames() {
  if (!namesList) {
    return;
  }

  const names = getNames();
  namesList.innerHTML = '';

  if (names.length === 0) {
    namesList.innerHTML = '<p>まだ対象者名は登録されていません。</p>';
    return;
  }

  names.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'name-item';

    row.innerHTML = `
      <div class="name-text">${item.name}</div>
      <button type="button" class="small-btn delete-name-btn" data-index="${index}">削除</button>
    `;

    namesList.appendChild(row);
  });

  document.querySelectorAll('.delete-name-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      const index = Number(e.target.dataset.index);
      deleteName(index);
    });
  });
}

function deleteName(index) {
  const names = getNames();
  names.splice(index, 1);
  saveNames(names);
  renderNames();
}

function buildExportData() {
  return {
    exportedAt: new Date().toISOString(),
    app: 'care-record-app',
    version: 3,
    names: getNames(),
    records: getRecords()
  };
}

function exportAllData() {
  const exportData = buildExportData();

  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)],
    { type: 'application/json' }
  );

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

function mergeNames(existingNames, importedNames) {
  const existing = normalizeNames(existingNames);
  const imported = normalizeNames(importedNames);

  const byId = new Map();

  existing.forEach((item) => {
    byId.set(item.id, item);
  });

  imported.forEach((item) => {
    byId.set(item.id, item);
  });

  return normalizeNames(Array.from(byId.values()));
}

function makeRecordKey(record) {
  const personId = typeof record.personId === 'string' ? record.personId.trim() : '';
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  return `${personId}__${date}`;
}

function importAllData(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      const importedNames = normalizeNames(imported.names || []);
      const importedRecords = normalizeRecords(imported.records || []);

      const mergedNames = mergeNames(getNames(), importedNames);
      saveNames(mergedNames);

      const existingRecords = getRecords();
      const importedKeys = new Set(importedRecords.map((record) => makeRecordKey(record)));
      const filteredExistingRecords = existingRecords.filter((record) => !importedKeys.has(makeRecordKey(record)));
      const mergedRecords = [...importedRecords, ...filteredExistingRecords];
      saveRecords(mergedRecords);

      renderNames();
      alert('データをインポートしました。対象者名一覧をマージし、personId と date が一致する記録はインポート内容で上書きしました。');
    } catch (error) {
      console.error(error);
      alert('JSON の読み込みに失敗しました。');
    }
  };

  reader.readAsText(file);
}

if (nameForm) {
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newName = personNameInput?.value.trim() || '';
    if (!newName) {
      alert('名前を入力してください。');
      return;
    }

    const names = getNames();

    if (names.some((item) => item.name === newName)) {
      alert('同じ名前はすでに登録されています。');
      return;
    }

    names.push({
      id: `n_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      name: newName
    });

    saveNames(names);

    if (personNameInput) {
      personNameInput.value = '';
    }

    renderNames();
  });
}

if (exportAllDataBtn) {
  exportAllDataBtn.addEventListener('click', exportAllData);
}

if (importAllDataFile) {
  importAllDataFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importAllData(file);
    e.target.value = '';
  });
}

window.addEventListener('pageshow', renderNames);
window.addEventListener('focus', renderNames);

function setupHelpToggle() {
  const toggleHelpBtn = document.getElementById('toggleHelpBtn');
  const helpSection = document.getElementById('helpSection');

  if (!toggleHelpBtn || !helpSection) {
    return;
  }

  toggleHelpBtn.addEventListener('click', () => {
    helpSection.hidden = !helpSection.hidden;
  });
}

setupHelpToggle();
renderNames();