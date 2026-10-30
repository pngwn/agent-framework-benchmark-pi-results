import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';
import { document } from '../../document.js';
import { englishName, getTypeDetails } from '../../lib/api.js';

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };
    const types = await getTypeDetails();
    return {
      title: 'Types – Pokédex',
      types: types.map((type) => ({
        name: type.name,
        label: englishName(type, type.name),
      })),
    };
  },

  document: (context: any) =>
    document({ ...context, title: context.props?.title ?? 'Pokédex' }),

  template: (context: any) => html`
    <main class="page types-page">
      <h1>Types</h1>
      <ul class="type-grid">
        ${context.props.types.map(
          (type: any) => html`
            <li>
              <a class=${`type-tile type-${type.name}`} href=${`/types/${type.name}`}>
                ${type.label}
              </a>
            </li>
          `,
        )}
      </ul>
    </main>
  `,
});
