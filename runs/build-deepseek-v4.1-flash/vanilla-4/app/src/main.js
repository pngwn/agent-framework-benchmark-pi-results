import './styles.css';
import { NotFoundError } from './api.js';
import { renderHome } from './pages/home.js';
import { renderPokemonPage } from './pages/pokemon.js';
import { renderMovePage } from './pages/move.js';
import { renderAbilityPage } from './pages/ability.js';
import { renderTypeListPage } from './pages/types.js';
import { renderTypePage } from './pages/type.js';
import { renderNotFoundPage } from './pages/not-found.js';

const main = document.getElementById('app');

function routeParts() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return [];
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

async function renderRoute() {
  let parts;
  try {
    parts = routeParts();
  } catch {
    renderNotFoundPage(main);
    return;
  }

  try {
    if (parts.length === 0) {
      await renderHome(main);
    } else if (parts.length === 1 && parts[0] === 'types') {
      await renderTypeListPage(main);
    } else if (parts.length === 2 && parts[0] === 'pokemon') {
      await renderPokemonPage(main, parts[1]);
    } else if (parts.length === 2 && parts[0] === 'moves') {
      await renderMovePage(main, parts[1]);
    } else if (parts.length === 2 && parts[0] === 'abilities') {
      await renderAbilityPage(main, parts[1]);
    } else if (parts.length === 2 && parts[0] === 'types') {
      await renderTypePage(main, parts[1]);
    } else {
      renderNotFoundPage(main);
    }
  } catch (error) {
    if (!(error instanceof NotFoundError)) console.error(error);
    renderNotFoundPage(main);
  }
}

renderRoute();
window.addEventListener('popstate', () => {
  renderRoute();
});
