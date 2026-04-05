const nameForm = document.getElementById('nameForm');
const personNameInput = document.getElementById('personName');
const namesList = document.getElementById('namesList');

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
  return normalizeNames(parsed);
}

function saveNames(names) {
  const normalized = normalizeNames(names);
  localStorage.setItem(NAMES_KEY, JSON.stringify(normalized));
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

window.addEventListener('pageshow', renderNames);
window.addEventListener('focus', renderNames);

renderNames();