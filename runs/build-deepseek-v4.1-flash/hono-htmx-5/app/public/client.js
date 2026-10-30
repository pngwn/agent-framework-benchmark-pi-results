document.addEventListener('click', (event) => {
  const clickedButton = event.target.closest('button[data-sort]');
  const header = clickedButton
    ? clickedButton.closest('th')
    : event.target.closest('th[data-sort]');
  if (!header) return;

  const table = header.closest('table');
  const body = table?.querySelector('tbody');
  if (!table || !body) return;

  const headerCells = [...header.parentElement.children];
  const columnIndex = headerCells.indexOf(header);
  if (columnIndex < 0) return;

  const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  for (const cell of headerCells) {
    if (cell.hasAttribute('aria-sort')) cell.setAttribute('aria-sort', cell === header ? direction : 'none');
  }
  if (!header.hasAttribute('aria-sort')) header.setAttribute('aria-sort', direction);

  const rows = [...body.rows].map((row, index) => ({
    row,
    index,
    cell: row.cells[columnIndex],
  }));

  rows.sort((a, b) => {
    const missingA = a.cell?.dataset.missing === 'true';
    const missingB = b.cell?.dataset.missing === 'true';
    if (missingA !== missingB) return missingA ? 1 : -1;
    if (missingA && missingB) return a.index - b.index;

    const type = a.cell?.dataset.sortType ?? 'text';
    const valueA = a.cell?.dataset.sortValue ?? '';
    const valueB = b.cell?.dataset.sortValue ?? '';

    let comparison;
    if (type === 'number') {
      comparison = Number(valueA) - Number(valueB);
    } else {
      comparison = valueA.localeCompare(valueB);
    }
    return direction === 'ascending' ? comparison : -comparison;
  });

  for (const entry of rows) body.appendChild(entry.row);
});
