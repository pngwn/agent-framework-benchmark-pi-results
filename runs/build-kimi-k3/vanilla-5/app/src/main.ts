import { navigate, onNavigate } from './nav';
import { renderHome } from './pages/home';
import { renderPokemon } from './pages/pokemon';
import { renderMove } from './pages/move';
import { renderAbility } from './pages/ability';
import { renderTypeList, renderType } from './pages/types';
import { renderNotFound } from './pages/notFound';

const app = document.getElementById('app')!;

let renderToken = 0;

async function render(): Promise<void> {
  const token = ++renderToken;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(location.search);
  app.innerHTML = '<p class="loading">Loading…</p>';
  try {
    if (path === '/') await renderHome(app, params);
    else if (path.startsWith('/pokemon/')) await renderPokemon(app, decodeURIComponent(path.slice('/pokemon/'.length)), params);
    else if (path.startsWith('/moves/')) await renderMove(app, decodeURIComponent(path.slice('/moves/'.length)));
    else if (path.startsWith('/abilities/')) await renderAbility(app, decodeURIComponent(path.slice('/abilities/'.length)));
    else if (path === '/types') await renderTypeList(app);
    else if (path.startsWith('/types/')) await renderType(app, decodeURIComponent(path.slice('/types/'.length)));
    else renderNotFound(app);
  } catch (e) {
    console.error(e);
    if (token === renderToken) {
      document.title = 'Error – Pokédex';
      app.innerHTML = '<h1>Error</h1><p>Something went wrong while loading this page.</p>';
    }
    return;
  }
  if (token !== renderToken) return;
  if (location.hash) {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } else {
    window.scrollTo(0, 0);
  }
}

onNavigate(render);
window.addEventListener('popstate', render);

// Client-side navigation for internal links.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || a.target) return;
  const href = a.getAttribute('href') ?? '';
  if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return;
  const url = new URL(href, location.origin);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});

void render();
