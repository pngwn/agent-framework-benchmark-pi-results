const search = document.getElementById('home-search');
const type = document.getElementById('home-type');
const generation = document.getElementById('home-generation');

let timer;
let requestNumber = 0;

function setQueryParam(params, key, value) {
  if (value) params.set(key, value);
  else params.delete(key);
}

function currentValues() {
  return {
    q: search?.value.trim() ?? '',
    type: type?.value ?? '',
    generation: generation?.value ?? '',
  };
}

function updateUrl(mode) {
  const values = currentValues();
  const url = new URL(window.location.href);
  setQueryParam(url.searchParams, 'q', values.q);
  setQueryParam(url.searchParams, 'type', values.type);
  setQueryParam(url.searchParams, 'generation', values.generation);
  url.searchParams.delete('page');
  url.hash = '';

  window.history[mode](null, '', url);
}

async function refreshResults() {
  const target = document.getElementById('home-results');
  if (!target) return;

  const requestId = ++requestNumber;

  try {
    const response = await fetch(window.location.href, {
      headers: { accept: 'text/html' },
    });
    if (!response.ok) return;

    const text = await response.text();
    if (requestId !== requestNumber) return;

    const parsed = new DOMParser().parseFromString(text, 'text/html');
    const next = parsed.getElementById('home-results');
    if (next) target.replaceWith(next);
  } catch {
    // The server-rendered results stay in place if the refresh fails.
  }
}

function scheduleRefresh(delay = 220) {
  window.clearTimeout(timer);
  timer = window.setTimeout(refreshResults, delay);
}

function applyControlsFromUrl() {
  const url = new URL(window.location.href);
  if (search) search.value = url.searchParams.get('q') ?? '';
  if (type) type.value = url.searchParams.get('type') ?? '';
  if (generation) generation.value = url.searchParams.get('generation') ?? '';
}

search?.addEventListener('input', () => {
  updateUrl('replaceState');
  scheduleRefresh();
});

type?.addEventListener('change', () => {
  updateUrl('pushState');
  scheduleRefresh(0);
});

generation?.addEventListener('change', () => {
  updateUrl('pushState');
  scheduleRefresh(0);
});

window.addEventListener('popstate', () => {
  applyControlsFromUrl();
  scheduleRefresh(0);
});
