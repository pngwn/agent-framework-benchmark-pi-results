import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { getTypeCollection } from '../../lib/api.js';

const BUILDING = () => process.env.GRACILE_BUILD === '1';

export default defineRoute({
  handler: {
    GET: async ({ responseInit }) => {
      if (BUILDING()) return {};

      try {
        const types = await getTypeCollection();
        return {
          pageTitle: 'Types – Pokédex',
          types: types.map((type) => ({
            name: type.name,
            englishName: type.englishName,
          })),
        };
      } catch (error) {
        console.error(error);
        responseInit.status = 500;
        return { pageTitle: 'Types – Pokédex', types: [] };
      }
    },
  },

  document: (context) => document(context),

  template: (context) => {
    const types = context.props?.GET?.types ?? [];

    return html`
      <h1>Types</h1>
      <ul class="type-grid">
        ${types.map(
          (type) => html`
            <li>
              <a class="type-${type.name}" href="/types/${type.name}">${type.englishName}</a>
            </li>
          `,
        )}
      </ul>
    `;
  },
});
