(() => {
  // Game picker: reload the page with the selected version group in the URL.
  const gameSelect = document.getElementById('game-select');
  if (gameSelect) {
    gameSelect.addEventListener('change', () => {
      location.href = `?game=${encodeURIComponent(gameSelect.value)}#moves`;
    });
  }

  // Sortable move tables.
  const MISSING = '—';
  document.querySelectorAll('table[data-sortable]').forEach((table) => {
    const tbody = table.tBodies[0];
    if (!tbody) return;
    table.querySelectorAll('thead th').forEach((th, colIndex) => {
      const button = th.querySelector('button');
      if (!button) return;
      button.addEventListener('click', () => {
        const numeric = th.dataset.type === 'num';
        const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        table.querySelectorAll('thead th[aria-sort]').forEach((other) => {
          other.removeAttribute('aria-sort');
        });
        th.setAttribute('aria-sort', dir);
        const value = (row) => (row.cells[colIndex]?.textContent ?? '').trim();
        const rows = Array.from(tbody.rows);
        rows.sort((a, b) => {
          const av = value(a);
          const bv = value(b);
          const aMissing = av === '' || av === MISSING;
          const bMissing = bv === '' || bv === MISSING;
          // Missing values sort last in both directions.
          if (aMissing || bMissing) return aMissing ? (bMissing ? 0 : 1) : -1;
          const cmp = numeric ? Number(av) - Number(bv) : av.localeCompare(bv);
          return dir === 'ascending' ? cmp : -cmp;
        });
        rows.forEach((row) => tbody.appendChild(row));
      });
    });
  });
})();
