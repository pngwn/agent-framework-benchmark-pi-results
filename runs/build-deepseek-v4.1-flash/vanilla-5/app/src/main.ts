import './styles.css';
import { h } from './dom';
import { renderAbility } from './pages/ability';
import { renderHome } from './pages/home';
import { renderMove } from './pages/move';
import { renderNotFound } from './pages/not-found';
import { renderPokemon } from './pages/pokemon';
import { renderType, renderTypes } from './pages/types';
import type { PageContext } from './types';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root');
const root: HTMLElement = rootElement;

const banner = h(
  'header',
  { class: 'banner' },
  h(
    'div',
    { class: 'container banner-inner' },
    h('a', { class: 'brand', href: '/' }, 'Pokédex'),
    h(
      'nav',
      { class: 'main-nav', 'aria-label': 'Primary' },
      h('a', { href: '/' }, 'Pokémon'),
      h('a', { href: '/types' }, 'Types'),
    ),
  ),
);

const footer = h(
  'footer',
  { class: 'contentinfo' },
  h(
    'div',
    { class: 'container' },
    'Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.',
  ),
);

let currentMain: HTMLElement | null = null;
let currentRender = 0;

function newMain(): HTMLElement {
  const main = h('main', { id: 'main' });
  if (currentMain) currentMain.replaceWith(main);
  else root.append(banner, main, footer);
  currentMain = main;
  return main;
}

function makeContext(main: HTMLElement, version: number): PageContext {
  return {
    main,
    params: new URLSearchParams(window.location.search),
    isCurrent: () => version === currentRender,
    setTitle: (title: string) => {
      if (version === currentRender) document.title = title;
    },
  };
}

function renderApp(): void {
  const version = ++currentRender;
  const main = newMain();
  main.replaceChildren(h('p', { class: 'loading' }, 'Loading…'));
  const ctx = makeContext(main, version);
  void route(ctx, version).catch((error) => {
    if (version !== currentRender) return;
    console.error(error);
    renderNotFound(ctx);
  });
}

async function route(ctx: PageContext, version: number): Promise<void> {
  const segments = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  let handled = false;

  if (segments.length === 0) {
    await renderHome(ctx);
    handled = true;
  } else if (segments.length === 1 && segments[0] === 'types') {
    await renderTypes(ctx);
    handled = true;
  } else if (segments.length === 2) {
    const [kind, rawName] = segments;
    const name = safeDecode(rawName) ?? rawName;
    if (kind === 'pokemon') {
      await renderPokemon(ctx, name);
      handled = true;
    } else if (kind === 'moves') {
      await renderMove(ctx, name);
      handled = true;
    } else if (kind === 'abilities') {
      await renderAbility(ctx, name);
      handled = true;
    } else if (kind === 'types') {
      await renderType(ctx, name);
      handled = true;
    }
  }

  if (!handled && version === currentRender) renderNotFound(ctx);
  if (version !== currentRender) return;

  if (window.location.hash) {
    const id = window.location.hash.slice(1);
    const target = document.getElementById(id);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function navigate(url: URL): void {
  if (!url.hash) window.scrollTo(0, 0);
  history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  renderApp();
}

document.addEventListener('click', (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return;
  const samePage =
    url.pathname === window.location.pathname && url.search === window.location.search;
  if (samePage && url.hash) return;

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;

  event.preventDefault();
  navigate(url);
});

window.addEventListener('popstate', renderApp);

document.title = 'Pokédex';
renderApp();
