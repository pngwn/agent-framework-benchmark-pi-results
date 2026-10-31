// Progressive enhancement for the Pokédex app.
// - Keeps htmx-pushed URLs clean by dropping empty form parameters.
// - Makes move table column headers sortable (event delegation, so tables
//   swapped in by htmx keep working).

document.addEventListener('htmx:configRequest', (event) => {
  const params = event.detail.parameters;
  for (const key of Object.keys(params)) {
    if (params[key] === '') delete params[key];
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('th > button.sort');
  if (!button) return;
  const th = button.closest('th');
  const table = th.closest('table');
  const tbody = table.tBodies[0];
  if (!tbody) return;

  const col = [...th.parentNode.children].indexOf(th);
  const numeric = th.dataset.type === 'number';
  const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';

  for (const other of table.querySelectorAll('th[aria-sort]')) other.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', dir);

  const value = (row) => (row.cells[col]?.textContent ?? '').trim();
  const isMissing = (v) => v === '' || v === '—';
  const rows = [...tbody.rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const ma = isMissing(va);
    const mb = isMissing(vb);
    if (ma && mb) return 0;
    if (ma) return 1; // missing values always sort last
    if (mb) return -1;
    const cmp = numeric ? Number(va) - Number(vb) : va.localeCompare(vb);
    return dir === 'ascending' ? cmp : -cmp;
  });
  for (const row of rows) tbody.appendChild(row);
});
