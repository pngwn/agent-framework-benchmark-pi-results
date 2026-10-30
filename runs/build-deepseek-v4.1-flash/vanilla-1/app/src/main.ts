import './style.css';
import { NotFoundError } from './api';
import { renderHome } from './pages/home';
import { renderPokemonPage } from './pages/pokemon';
import {
  renderAbilityPage,
  renderMovePage,
  renderNotFound,
  renderTypeList,
  renderTypePage,
} from './pages/details';

const main = document.querySelector<HTMLElement>('main');
if (!main) throw new Error('Missing main element');
const appMain: HTMLElement = main;

let renderToken = 0;

function pathParts(pathname: string): string[] | null {
  try {
    return pathname
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
}

async function renderRoute(): Promise<void> {
  const token = ++renderToken;
  const isActive = (): boolean => token === renderToken;
  const url = new URL(location.href);
  const parts = pathParts(url.pathname);

  appMain.innerHTML = '<p class="loading">Loading…</p>';
  if (!url.hash) window.scrollTo(0, 0);

  try {
    if (!parts) throw new NotFoundError();
    if (parts.length === 0) {
      await renderHome(appMain, url, isActive);
    } else if (parts.length === 1 && parts[0] === 'types') {
      await renderTypeList(appMain, isActive);
    } else if (parts.length === 2 && parts[0] === 'pokemon') {
      await renderPokemonPage(appMain, url, parts[1], isActive);
    } else if (parts.length === 2 && parts[0] === 'moves') {
      await renderMovePage(appMain, parts[1], isActive);
    } else if (parts.length === 2 && parts[0] === 'abilities') {
      await renderAbilityPage(appMain, parts[1], isActive);
    } else if (parts.length === 2 && parts[0] === 'types') {
      await renderTypePage(appMain, parts[1], isActive);
    } else {
      throw new NotFoundError();
    }

    if (isActive() && location.hash) {
      const hash = location.hash.slice(1);
      requestAnimationFrame(() => {
        if (isActive()) document.getElementById(hash)?.scrollIntoView();
      });
    }
  } catch (error) {
    if (!isActive()) return;
    if (error instanceof NotFoundError) {
      renderNotFound(appMain);
    } else {
      console.error(error);
      renderNotFound(appMain);
    }
  }
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const next = new URL(anchor.href, location.href);
  if (next.origin !== location.origin) return;
  event.preventDefault();
  const nextUrl = `${next.pathname}${next.search}${next.hash}`;
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  if (nextUrl === currentUrl) return;
  history.pushState(null, '', nextUrl);
  void renderRoute();
});

window.addEventListener('popstate', () => {
  void renderRoute();
});

void renderRoute();
