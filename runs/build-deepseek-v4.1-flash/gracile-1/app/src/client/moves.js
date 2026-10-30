const NUMERIC_KEYS = new Set(['level', 'power', 'accuracy', 'pp']);

function cellValue(row, index, key) {
  const cell = row.children[index];
  const text = (cell?.textContent ?? '').trim();
  if (text === '—' || text === '') return { missing: true, value: null, text };
  if (['level', 'power', 'accuracy', 'pp'].includes(key)) {
    const number = Number(text.replace(/,/g, ''));
    return { missing: Number.isNaN(number), value: Number.isNaN(number) ? null : number, text };
  }
  return { missing: false, value: text.toLocaleLowerCase(), text };
}

function sortTable(table, header) {
  const body = table.tBodies[0];
  if (!body) return;
  const key = header.dataset.sortKey;
  const index = Number(header.dataset.index);
  const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';

  for (const other of table.querySelectorAll('th[data-sort-key]')) {
    other.removeAttribute('aria-sort');
  }
  header.setAttribute('aria-sort', direction);

  const rows = Array.from(body.rows);
  rows.sort((a, b) => {
    const left = cellValues(a, index, key);
    const right = cellValues(b, index, key);
    if (left.missing && right.missing) return 0;
    if (left.missing) return 1;
    if (right.missing) return -1;
    let comparison;
    if (NUMERIC_KEYS.has(key)) comparison = left.value - right.value;
    else comparison = String(left.value).localeCompare(String(right.value));
    return direction === 'ascending' ? comparison : -comparison;
  });
  for (const row of rows) body.appendChild(row);
}

const cellValues = (row, index, key) => cellValue(row, index, key);

function initSortableTables() {
  for (const table of document.querySelectorAll('table[data-sortable]')) {
    for (const header of table.querySelectorAll('th[data-sort-key]')) {
      const button = header.querySelector('button');
      if (!button) continue;
      header.dataset.index = String(Array.from(header.parentElement.children).indexOf(header));
      header.addEventListener('click', (event) => {
        event.preventDefault();
        sortTable(table, header);
      });
    }
  }
}

function initGameSelect() {
  const select = document.querySelector('select[data-game-select]');
  if (!select) return;
  select.addEventListener('change', () => {
    const url = new URL(window.location.href);
    if (!select.value || select.value === select.dataset.defaultGame) url.searchParams.delete('game');
    else url.searchParams.set('game', select.value);
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  });
}

export function initMoves() {
  initSortableTables();
  initGameSelect();
}
