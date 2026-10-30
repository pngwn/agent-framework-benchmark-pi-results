import { getTypeIndex } from '../data.js';
import { escapeHtml, humanize, setDocumentTitle } from '../utils.js';

export async function renderTypeListPage(main) {
  const types = await getTypeIndex();

  main.innerHTML = `
    <h1>Types</h1>
    <ul class="type-grid">
      ${types.map((type) => `<li><a class="type-tile type-${type.name}" style="--badge-color: var(--type-${type.name}, var(--color-text-muted))" href="/types/${escapeHtml(type.name)}">${escapeHtml(type.label ?? humanize(type.name))}</a></li>`).join('')}
    </ul>
  `;

  setDocumentTitle('Types');
}
