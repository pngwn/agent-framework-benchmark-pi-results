// Pokémon page interactivity: game selection (URL-driven) and sortable
// moves tables.

const gameSelect = document.getElementById('game-select');
gameSelect?.addEventListener('change', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('game', gameSelect.value);
  window.location.assign(url.href);
});

const NUMERIC_COLUMNS = new Set(['Level', 'Power', 'Accuracy', 'PP']);

for (const table of document.querySelectorAll('.moves-table')) {
  const headers = [...table.querySelectorAll('thead th')];
  const tbody = table.tBodies[0];
  if (!tbody) continue;

  for (const header of headers) {
    header.querySelector('button')?.addEventListener('click', () => {
      const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
      for (const other of headers) other.removeAttribute('aria-sort');
      header.setAttribute('aria-sort', direction);

      const columnIndex = headers.indexOf(header);
      const numeric = NUMERIC_COLUMNS.has(header.textContent.trim());

      const value = (row) => row.cells[columnIndex]?.dataset.value ?? '';
      const rows = [...tbody.rows];
      rows.sort((a, b) => {
        const aValue = value(a);
        const bValue = value(b);
        // Missing values always sort last, in both directions.
        if (aValue === '' && bValue === '') return 0;
        if (aValue === '') return 1;
        if (bValue === '') return -1;
        let result;
        if (numeric) result = Number(aValue) - Number(bValue);
        else result = aValue.localeCompare(bValue);
        return direction === 'ascending' ? result : -result;
      });
      for (const row of rows) tbody.appendChild(row);
    });
  }
}
