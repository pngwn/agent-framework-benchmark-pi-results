function ready(fn: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function navigateWithFilters(filters: HTMLFormElement) {
  const search = filters.querySelector<HTMLInputElement>('[data-filter="q"]');
  const type = filters.querySelector<HTMLSelectElement>('[data-filter="type"]');
  const generation = filters.querySelector<HTMLSelectElement>('[data-filter="generation"]');
  const url = new URL(window.location.href);

  const q = search?.value.trim() ?? '';
  const selectedType = type?.value ?? '';
  const selectedGeneration = generation?.value ?? '';

  url.searchParams.delete('q');
  url.searchParams.delete('type');
  url.searchParams.delete('generation');
  url.searchParams.delete('page');

  if (q) url.searchParams.set('q', q);
  if (selectedType) url.searchParams.set('type', selectedType);
  if (selectedGeneration) url.searchParams.set('generation', selectedGeneration);

  window.location.assign(url.toString());
}

function setupFilters() {
  const filters = document.querySelector<HTMLFormElement>('[data-filters]');
  if (!filters) return;

  const search = filters.querySelector<HTMLInputElement>('[data-filter="q"]');
  const selects = filters.querySelectorAll<HTMLSelectElement>('select[data-filter]');

  let timer: number | undefined;
  if (search) {
    search.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => navigateWithFilters(filters), 300);
    });
    search.addEventListener('search', () => {
      window.clearTimeout(timer);
      navigateWithFilters(filters);
    });
  }

  for (const select of selects) {
    select.addEventListener('change', () => {
      window.clearTimeout(timer);
      navigateWithFilters(filters);
    });
  }
}

function setupGameSelect() {
  const select = document.querySelector<HTMLSelectElement>('[data-game-select]');
  if (!select) return;
  select.addEventListener('change', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('game', select.value);
    window.location.assign(url.toString());
  });
}

function cellValue(row: HTMLTableRowElement, index: number) {
  const cell = row.cells[index];
  if (!cell) return { missing: true, value: '' };
  const value = cell.dataset.sortValue ?? cell.textContent?.trim() ?? '';
  return { missing: value === '', value };
}

function setupSortableTables() {
  const tables = document.querySelectorAll<HTMLTableElement>('table[data-sortable]');
  for (const table of tables) {
    const body = table.tBodies[0];
    const headers = [...table.querySelectorAll<HTMLTableCellElement>('thead th')];
    if (!body) continue;

    headers.forEach((header, index) => {
      const button = header.querySelector<HTMLButtonElement>('button');
      if (!button) return;
      button.addEventListener('click', () => {
        const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        for (const other of headers) other.removeAttribute('aria-sort');
        header.setAttribute('aria-sort', direction);

        const numeric = button.dataset.sortType === 'number';
        const rows = [...body.rows];
        rows.sort((a, b) => {
          const av = cellValue(a, index);
          const bv = cellValue(b, index);
          if (av.missing && bv.missing) return 0;
          if (av.missing) return 1;
          if (bv.missing) return -1;

          const comparison = numeric
            ? Number(av.value) - Number(bv.value)
            : av.value.localeCompare(bv.value);
          return direction === 'ascending' ? comparison : -comparison;
        });
        for (const row of rows) body.append(row);
      });
    });
  }
}

ready(() => {
  setupFilters();
  setupGameSelect();
  setupSortableTables();
});
