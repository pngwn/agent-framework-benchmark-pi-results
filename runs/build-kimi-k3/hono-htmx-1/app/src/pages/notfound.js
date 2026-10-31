import { html } from 'hono/html';
import { layout } from '../views/layout.js';

export function notFoundPage(c) {
  return c.html(
    layout({
      title: 'Not found – Pokédex',
      main: html`<h1>Not found</h1>
        <p><a href="/">Back to the Pokédex</a></p>`,
    }),
    404,
  );
}
