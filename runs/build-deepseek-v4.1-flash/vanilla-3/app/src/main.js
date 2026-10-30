import './tokens.css';
import './style.css';

import { renderHome } from './pages/home.js';
import { renderPokemon } from './pages/pokemon.js';
import { renderMove } from './pages/move.js';
import { renderAbility } from './pages/ability.js';
import { renderType, renderTypeList } from './pages/types.js';
import { renderNotFound } from './pages/not-found.js';
import { el } from './ui.js';

const app = document.getElementById('app');

const banner = el(
  'header',
  { class: 'banner' },
  el(
    'div',
    { class: 'banner-inner wrap' },
    el('a', { class: 'brand', href: '/', text: 'Pokédex' }),
    el(
      'nav',
      { 'aria-label': 'Main' },
      el('a', { href: '/', text: 'Pokémon' }),
      el('a', { href: '/types', text: 'Types' }),
    ),
  ),
);

const main = el('main', { id: 'main', class: 'wrap' });

const footer = el(
  'footer',
  { class: 'footer' },
  el(
    'div',
    { class: 'wrap' },
    document.createTextNode(
      'Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.',
    ),
  ),
);

app.replaceChildren(banner, main, footer);

let renderNumber = 0;

function routeFor(pathname) {
  const decoded = pathname
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });

  if (!decoded.length) return { type: 'home' };
  if (decoded.length === 1 && decoded[0] === 'types') return { type: 'type-list' };
  if (decoded.length === 2) {
    const [section, name] = decoded;
    if (section === 'pokemon') return { type: 'pokemon', name };
    if (section === 'moves') return { type: 'move', name };
    if (section === 'abilities') return { type: 'ability', name };
    if (section === 'types') return { type: 'type', name };
  }
  return { type: 'not-found' };
}

async function renderRoute() {
  const current = ++renderNumber;
  const isCurrent = () => current === renderNumber;
  const route = routeFor(location.pathname);
  const searchParams = new URLSearchParams(location.search);

  let result = null;
  try {
    if (route.type === 'home') {
      result = await renderHome(main, searchParams, isCurrent);
    } else if (route.type === 'type-list') {
      result = await renderTypeList(main, searchParams, isCurrent);
    } else if (route.type === 'pokemon') {
      result = await renderPokemon(main, searchParams, isCurrent, route.name);
    } else if (route.type === 'move') {
      result = await renderMove(main, searchParams, isCurrent, route.name);
    } else if (route.type === 'ability') {
      result = await renderAbility(main, searchParams, isCurrent, route.name);
    } else if (route.type === 'type') {
      result = await renderType(main, searchParams, isCurrent, route.name);
    }
  } catch (error) {
    console.error(error);
    result = null;
  }

  if (!isCurrent()) return;

  if (!result) result = renderNotFound();
  main.replaceChildren(result.content);
  document.title = result.title;

  const hash = location.hash ? location.hash.slice(1) : '';
  if (hash) {
    let target = null;
    try {
      target = document.getElementById(decodeURIComponent(hash));
    } catch {
      target = document.getElementById(hash);
    }
    if (target) {
      window.scrollTo(0, 0);
      target.scrollIntoView({ block: 'start' });
      if (typeof result.afterRender === 'function') result.afterRender();
      return;
    }
  }

  window.scrollTo(0, 0);
  if (typeof result.afterRender === 'function') result.afterRender();
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const anchor = event.target.closest('a[href]');
  if (!anchor || anchor.hasAttribute('download')) return;
  if (anchor.target && anchor.target !== '_self') return;

  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;

  const samePath = url.pathname === location.pathname;
  const sameSearch = url.search === location.search;
  if (samePath && sameSearch) {
    event.preventDefault();
    if (url.hash) {
      const target = document.getElementById(url.hash.slice(1));
      if (target) {
        history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
        target.scrollIntoView({ block: 'start' });
      }
    } else {
      window.scrollTo(0, 0);
    }
    return;
  }

  event.preventDefault();
  history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  renderRoute();
});

window.addEventListener('popstate', () => {
  renderRoute();
});

renderRoute();
