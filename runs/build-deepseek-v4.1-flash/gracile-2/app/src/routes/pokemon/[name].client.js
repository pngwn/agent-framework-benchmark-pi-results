const gameSelect = document.getElementById('pokemon-game');

gameSelect?.addEventListener('change', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('game', gameSelect.value);
  if (window.location.hash) url.hash = window.location.hash;
  window.location.assign(url);
});

function valueOf(cell) {
  const value = cell?.getAttribute('data-sort-value');
  return value === null ? '' : value;
}

function compareRows(a, b, index, type, direction) {
  const aValue = valueOf(a.children[index]);
  const bValue = valueOf(b.children[index]);

  const aMissing = aValue === '';
  const bMissing = bValue === '';
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result;
  if (type === 'number') {
    result = Number(aValue) - Number(bValue);
    if (Number.isNaN(result)) result = aValue.localeCompare(bValue);
  } else {
    result = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
  }

  return direction === 'ascending' ? result : -result;
}

for (const button of document.querySelectorAll('.move-table th button')) {
  button.addEventListener('click', () => {
    const header = button.closest('th');
    const table = button.closest('table');
    const body = table?.querySelector('tbody');
    if (!header || !table || !body) return;

    const nextDirection = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    const headers = [...table.querySelectorAll('thead th')];
    for (const item of headers) item.setAttribute('aria-sort', 'none');
    header.setAttribute('aria-sort', nextDirection);

    const index = headers.indexOf(header);
    const type = button.getAttribute('data-sort-type') ?? 'text';
    const rows = [...body.querySelectorAll('tr')];
    rows.sort((a, b) => compareRows(a, b, index, type, nextDirection));

    for (const row of rows) body.append(row);
  });
}
