// Client-side behavior: htmx cleanup, sortable move tables, game selector.

// Drop empty filter parameters so the pushed URL stays clean.
document.addEventListener('htmx:configRequest', (event) => {
  const params = event.detail.parameters;
  for (const key of Object.keys(params)) {
    if (params[key] === '') delete params[key];
  }
});

// Sortable tables: click a column header button to sort; click again to flip.
// Missing values (empty data-v) always sort last.
document.addEventListener('click', (event) => {
  const button = event.target.closest('th button[data-sort]');
  if (!button) return;
  const th = button.closest('th');
  const table = th.closest('table');
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const col = [...th.parentElement.children].indexOf(th);
  const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  for (const header of table.querySelectorAll('th[aria-sort]')) header.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', dir);

  const value = (row) => row.cells[col]?.dataset.v ?? '';
  const rows = [...tbody.rows];
  rows.sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === '' && vb === '') return 0;
    if (va === '') return 1;
    if (vb === '') return -1;
    const na = Number(va);
    const nb = Number(vb);
    const cmp = !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : va.localeCompare(vb);
    return dir === 'ascending' ? cmp : -cmp;
  });
  for (const row of rows) tbody.appendChild(row);
});

// The game selector navigates to ?game=<version group>#moves.
document.addEventListener('change', (event) => {
  const select = event.target.closest('select[data-game-select]');
  if (!select) return;
  const url = new URL(window.location.href);
  url.searchParams.set('game', select.value);
  url.hash = 'moves';
  window.location.href = url.toString();
});
