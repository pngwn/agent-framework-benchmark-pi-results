// Pokémon page interactivity: sortable move tables and the game selector.

function initSortableTables() {
  for (const table of document.querySelectorAll('table.moves-table')) {
    const headers = [...table.tHead.querySelectorAll('th')];
    headers.forEach((th, columnIndex) => {
      const button = th.querySelector('button');
      if (!button) return;
      button.addEventListener('click', () => {
        const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        for (const other of headers) other.removeAttribute('aria-sort');
        th.setAttribute('aria-sort', direction);

        const numeric = th.dataset.sortType === 'num';
        const tbody = table.tBodies[0];
        const rows = [...tbody.rows];
        const value = (row) => row.cells[columnIndex].textContent.trim();
        rows.sort((a, b) => {
          const va = value(a);
          const vb = value(b);
          // Missing values sort last in both directions.
          const ma = va === '—';
          const mb = vb === '—';
          if (ma && mb) return 0;
          if (ma) return 1;
          if (mb) return -1;
          const cmp = numeric ? Number.parseFloat(va) - Number.parseFloat(vb) : va.localeCompare(vb);
          return direction === 'ascending' ? cmp : -cmp;
        });
        for (const row of rows) tbody.appendChild(row);
      });
    });
  }
}

function initGameSelect() {
  const select = document.getElementById('game-select');
  if (!select) return;
  select.addEventListener('change', () => {
    const url = new URL(window.location.href);
    url.search = `?game=${encodeURIComponent(select.value)}`;
    url.hash = 'moves';
    window.location.assign(url);
  });
}

export function initPokemonPage() {
  initSortableTables();
  initGameSelect();
}
