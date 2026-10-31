import { html } from 'lit';
import { defineRoute } from '@gracile/gracile/route';
import { document } from '../../document.js';
import { getTypes } from '../../lib/data.js';
import { englishName } from '../../lib/format.js';

export default defineRoute({
  handler: async () => {
    const types = await getTypes();
    return {
      title: 'Types – Pokédex',
      types: types.map((type) => ({ name: type.name, en: englishName(type) ?? type.name })),
    };
  },

  document: (context) => document({ ...context, ...(context.props ?? {}) }),

  template: (context) => html`
    <h1>Types</h1>
    <ul class="type-grid">
      ${context.props.types.map(
        (type) => html`<li><a class="type-${type.name}" href="/types/${type.name}">${type.en}</a></li>`,
      )}
    </ul>
  `,
});
