// Client-side router and bootstrap.

import './styles.css';
import { renderHome } from './pages/home.js';
import { renderPokemon } from './pages/pokemon.js';
import { renderMove } from './pages/move.js';
import { renderAbility } from './pages/ability.js';
import { renderTypes } from './pages/types.js';
import { renderType } from './pages/type.js';
import { renderNotFound } from './pages/notfound.js';

const main = document.getElementById('main');
let navToken = 0;

function route(path) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return renderHome;
  if (segments.length === 1) {
    if (segments[0] === 'types') return renderTypes;
    return null;
  }
  if (segments.length === 2) {
    const [section, rawName] = segments;
    const name = decodeURIComponent(rawName).toLowerCase();
    if (section === 'pokemon') return (m, url, ctx) => renderPokemon(m, name, url, ctx);
    if (section === 'moves') return (m, url, ctx) => renderMove(m, name, url, ctx);
    if (section === 'abilities') return (m, url, ctx) => renderAbility(m, name, url, ctx);
    if (section === 'types') return (m, url, ctx) => renderType(m, name, url, ctx);
  }
  return null;
}

async function navigate(url, { push = false } = {}) {
  const token = ++navToken;
  const ctx = { stale: () => token !== navToken };
  if (push) history.pushState(null, '', url);

  const path = url.pathname.replace(/\/+$/, '') || '/';
  const renderer = route(path);

  try {
    if (renderer) await renderer(main, url, ctx);
    else renderNotFound(main);
  } catch (err) {
    console.error(err);
    if (!ctx.stale()) {
      main.innerHTML = '<h1>Something went wrong</h1><p>Could not load data from the API.</p>';
    }
    return;
  }

  if (ctx.stale()) return;
  if (url.hash) {
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (target) {
      target.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
  }
}

// Intercept same-origin internal links.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const anchor = event.target.closest('a[href]');
  if (!anchor) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  navigate(url, { push: true });
});

window.addEventListener('popstate', () => navigate(new URL(location.href)));

navigate(new URL(location.href));
