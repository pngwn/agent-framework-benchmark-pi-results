// Pokémon page: game picker navigates to ?game=..., and move tables are sortable.
(function () {
  const gameSelect = document.querySelector('[data-game-select]');
  if (gameSelect) {
    gameSelect.addEventListener('change', () => {
      const base = gameSelect.getAttribute('data-base');
      location.assign(`${base}?game=${encodeURIComponent(gameSelect.value)}#moves`);
    });
  }

  const compare = (a, b, numeric, dir) => {
    const aMissing = a === '';
    const bMissing = b === '';
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1; // missing values sort last in both directions
    if (bMissing) return -1;
    const result = numeric ? Number(a) - Number(b) : a.localeCompare(b);
    return dir === 'ascending' ? result : -result;
  };

  document.querySelectorAll('table[data-sortable]').forEach((table) => {
    const heads = [...table.tHead.rows[0].cells];
    heads.forEach((th, colIndex) => {
      const trigger = th.querySelector('button') ?? th;
      trigger.addEventListener('click', () => {
        const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        heads.forEach((h) => h.removeAttribute('aria-sort'));
        th.setAttribute('aria-sort', dir);
        const numeric = th.getAttribute('data-sort-type') === 'number';
        const tbody = table.tBodies[0];
        const rows = [...tbody.rows];
        const value = (row) => row.cells[colIndex]?.getAttribute('data-v') ?? '';
        rows.sort((a, b) => compare(value(a), value(b), numeric, dir));
        rows.forEach((row) => tbody.appendChild(row));
      });
    });
  });
})();
