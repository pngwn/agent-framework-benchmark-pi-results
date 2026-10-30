import './tokens.css';
import './style.css';
import { NotFoundError } from './api';
import { h } from './dom';
import { renderHome } from './pages/home';
import { renderPokemon } from './pages/pokemon';
import { renderMove } from './pages/move';
import { renderAbility } from './pages/ability';
import { renderTypes, renderType } from './pages/types';
import { renderTeam } from './pages/team';

export interface PageContext {
  main: HTMLElement;
  url: URL;
  /** False once the user has navigated elsewhere; pages should stop updating the DOM. */
  isCurrent: () => boolean;
}

export type PageResult = { title: string; nav?: 'pokemon' | 'types' | 'team'; ready?: Promise<void> };
type Page = (ctx: PageContext, ...params: string[]) => Promise<PageResult>;

const routes: [RegExp, Page][] = [
  [/^\/$/, renderHome],
  [/^\/team\/?$/, renderTeam],
  [/^\/types\/?$/, renderTypes],
  [/^\/types\/([^/]+)\/?$/, renderType],
  [/^\/pokemon\/([^/]+)\/?$/, renderPokemon],
  [/^\/moves\/([^/]+)\/?$/, renderMove],
  [/^\/abilities\/([^/]+)\/?$/, renderAbility],
];

const main = document.getElementById('main') as HTMLElement;
let navigation = 0;

export function setTitle(h1: string | null): void {
  document.title = h1 ? `${h1} – Pokédex` : 'Pokédex';
}

function setNav(active: string | undefined): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-nav]')) {
    if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

export function renderNotFound(target: HTMLElement): PageResult {
  target.replaceChildren(
    h('h1', null, 'Not found'),
    h('p', { class: 'not-found__back' }, h('a', { href: '/' }, 'Back to the Pokédex')),
  );
  return { title: 'Not found' };
}

function renderError(target: HTMLElement): PageResult {
  target.replaceChildren(
    h('h1', null, 'Something went wrong'),
    h('p', null, 'The Pokédex data could not be loaded. Please try again.'),
    h('p', null, h('a', { href: '/' }, 'Back to the Pokédex')),
  );
  return { title: 'Something went wrong' };
}

async function render(scrollToTop: boolean): Promise<void> {
  const id = ++navigation;
  const url = new URL(location.href);
  const isCurrent = () => id === navigation;
  main.setAttribute('aria-busy', 'true');
  if (scrollToTop) window.scrollTo(0, 0);

  // Render into a detached container so the previous page stays until the new one is ready.
  const target = h('div', { class: 'page' });
  let result: PageResult;
  const match = routes.map(([re, page]) => [url.pathname.match(re), page] as const).find(([m]) => m);
  try {
    if (!match) result = renderNotFound(target);
    else {
      const params = match[0]!.slice(1).map((p) => decodeURIComponent(p));
      result = await match[1]({ main: target, url, isCurrent }, ...params);
    }
  } catch (err) {
    if (!isCurrent()) return;
    if (err instanceof NotFoundError) result = renderNotFound(target);
    else {
      console.error(err);
      result = renderError(target);
    }
  }
  if (!isCurrent()) return;
  main.replaceChildren(...target.childNodes);
  main.removeAttribute('aria-busy');
  setTitle(result.title === 'Pokédex' ? null : result.title);
  setNav(result.nav);
  await result.ready?.catch(() => {});
  if (isCurrent() && url.hash) {
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
  }
}

export function navigate(href: string, { replace = false } = {}): void {
  if (replace) history.replaceState(null, '', href);
  else history.pushState(null, '', href);
  void render(!new URL(href, location.href).hash);
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest?.('a');
  if (!link || !link.href || link.target || link.hasAttribute('download')) return;
  const dest = new URL(link.href);
  if (dest.origin !== location.origin) return;
  // Same-page hash links: let the browser scroll.
  if (dest.pathname === location.pathname && dest.search === location.search && dest.hash) return;
  event.preventDefault();
  navigate(dest.pathname + dest.search + dest.hash);
});

window.addEventListener('popstate', () => void render(false));

history.scrollRestoration = 'manual';
void render(false);
