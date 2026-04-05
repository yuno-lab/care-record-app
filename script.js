const form = document.getElementById('recordForm');
const recordsList = document.getElementById('recordsList');
const STORAGE_KEY = 'careRecords';

function getRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function renderRecords() {
  const records = getRecords();
  recordsList.innerHTML = '';

  if (records.length === 0) {
    recordsList.innerHTML = '<p>まだ記録はありません。</p>';
    return;
  }

  records.forEach((record, index) => {
    const card = document.createElement('div');
    card.className = 'record-card';

    card.innerHTML = `
      <p><strong>日付:</strong> ${record.date}</p>
      <p><strong>対象者名:</strong> ${record.name}</p>
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

  document.querySelectorAll('.delete-btn').forEach(button => {
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

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const record = {
    date: document.getElementById('date').value,
    name: document.getElementById('name').value,
    meal: document.getElementById('meal').value,
    water: document.getElementById('water').value,
    medicine: document.getElementById('medicine').value,
    toilet: document.getElementById('toilet').value,
    temperature: document.getElementById('temperature').value,
    memo: document.getElementById('memo').value
  };

  const records = getRecords();
  records.unshift(record);
  saveRecords(records);

  form.reset();
  renderRecords();
});

renderRecords();