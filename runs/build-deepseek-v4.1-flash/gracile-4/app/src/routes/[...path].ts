import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';
import { document } from '../document.js';

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };
    context.responseInit.status = 404;
    return { title: 'Not found – Pokédex', notFound: true };
  },

  document: (context: any) =>
    document({ ...context, title: context.props?.title ?? 'Pokédex' }),

  template: () => html`
    <main class="page">
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>
    </main>
  `,
});
