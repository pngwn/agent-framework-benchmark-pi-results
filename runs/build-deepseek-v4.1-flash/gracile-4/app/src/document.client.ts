let searchTimer: number | undefined;
let controller: AbortController | null = null;

function closestElement(target: EventTarget | null, selector: string): Element | null {
  return target instanceof Element ? target.closest(selector) : null;
}

async function swapMain(url: URL, historyMode: 'push' | 'replace' | 'none'): Promise<void> {
  const sequence = navigationEpoch();
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  if (historyMode === 'push') history.pushState({}, '', url);
  else if (historyMode === 'replace') history.replaceState({}, '', url);

  try {
    const response = await fetch(url.href, {
      signal,
      headers: { Accept: 'text/html' },
    });
    if (!response.ok && response.status !== 404) return;
    const html = await response.text();
    if (sequence !== epoch) return;

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const nextMain = parsed.querySelector('main');
    const currentMain = document.querySelector('main');
    if (!nextMain || !currentMain) return;

    currentMain.replaceWith(document.importNode(nextMain, true));
    document.title = parsed.title;
  } catch (error) {
    if ((error as Error)?.name !== 'AbortError') console.error(error);
  }
}

let epoch = 0;
function navigationEpoch(): number {
  epoch += 1;
  return epoch;
}
function homeUrlFromControls(): URL {
  const url = new URL('/', location.origin);
  const search = document.querySelector<HTMLInputElement>('[data-home-search]');
  const type = document.querySelector<HTMLSelectElement>('[data-home-type]');
  const generation = document.querySelector<HTMLSelectElement>('[data-home-generation]');

  const q = search?.value.trim() ?? '';
  if (q) url.searchParams.set('q', q);
  if (type?.value) url.searchParams.set('type', type.value);
  if (generation?.value) url.searchParams.set('generation', generation.value);
  return url;
}

function navigateHome(historyMode: 'push' | 'replace'): void {
  if (!document.querySelector('[data-home-filters]')) return;
  void swapMain(homeUrlFromControls(), historyMode);
}

function navigateGame(historyMode: 'push' | 'replace'): void {
  const select = document.querySelector<HTMLSelectElement>('[data-game-select]');
  if (!select) return;
  const url = new URL(location.href);
  if (select.value) url.searchParams.set('game', select.value);
  else url.searchParams.delete('game');
  void swapMain(url, historyMode);
}

document.addEventListener('input', (event) => {
  if (!closestElement(event.target, '[data-home-search]')) return;
  if (searchTimer !== undefined) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    searchTimer = undefined;
    navigateHome('replace');
  }, 200);
});

document.addEventListener('change', (event) => {
  if (searchTimer !== undefined) {
    window.clearTimeout(searchTimer);
    searchTimer = undefined;
  }
  if (closestElement(event.target, '[data-home-type], [data-home-generation]')) {
    navigateHome('push');
    return;
  }
  if (closestElement(event.target, '[data-game-select]')) {
    navigateGame('push');
  }
});

document.addEventListener('submit', (event) => {
  if (closestElement(event.target, '[data-home-filters]')) event.preventDefault();
});

window.addEventListener('popstate', () => {
  void swapMain(new URL(location.href), 'none');
});

function compareRows(
  a: HTMLTableRowElement,
  b: HTMLTableRowElement,
  index: number,
  type: string,
  direction: 'ascending' | 'descending',
): number {
  const aCell = a.cells[index];
  const bCell = b.cells[index];
  const aMissing = aCell?.hasAttribute('data-sort-missing') ?? true;
  const bMissing = bCell?.hasAttribute('data-sort-missing') ?? true;

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  const aValue = aCell.dataset.sortValue ?? aCell.textContent ?? '';
  const bValue = bCell.dataset.sortValue ?? bCell.textContent ?? '';

  let comparison: number;
  if (type === 'number') {
    comparison = Number.parseFloat(aValue) - Number.parseFloat(bValue);
  } else {
    comparison = aValue.localeCompare(bValue, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  return direction === 'ascending' ? comparison : -comparison;
}

document.addEventListener('click', (event) => {
  const header = closestElement(event.target, 'th[data-sort-type]');
  if (!header || header.querySelector('a')) return;

  const table = header.closest('table');
  if (!table?.tHead || !table.tBodies[0]) return;

  const headers = [...table.tHead.rows[0].cells];
  const index = header.cellIndex;
  const type = header.getAttribute('data-sort-type') ?? 'text';
  const direction =
    header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';

  for (const other of headers) other.setAttribute('aria-sort', 'none');
  header.setAttribute('aria-sort', direction);

  const body = table.tBodies[0];
  const rows = [...body.rows].sort((a, b) => compareRows(a, b, index, type, direction));
  for (const row of rows) body.append(row);
});
