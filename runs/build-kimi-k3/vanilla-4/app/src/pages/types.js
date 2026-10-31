// `/types` — the 18 types.

import { loadCatalog } from '../catalog.js';
import { esc } from '../util.js';

export async function renderTypes(main, url, ctx) {
  const catalog = await loadCatalog();
  if (ctx.stale()) return;

  document.title = 'Types – Pokédex';

  const items = catalog.types
    .map((t) => `<li><a class="type-tile type-${esc(t.name)}" href="/types/${esc(t.name)}">${esc(t.en)}</a></li>`)
    .join('');

  main.innerHTML = `<h1>Types</h1><ul class="type-grid">${items}</ul>`;
}
