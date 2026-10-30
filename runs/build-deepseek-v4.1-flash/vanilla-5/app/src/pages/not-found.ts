import { h } from '../dom';
import type { PageContext } from '../types';

export function renderNotFound(ctx: PageContext): void {
  ctx.setTitle('Not found – Pokédex');
  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      h('h1', {}, 'Not found'),
      h('p', { class: 'not-found-link' }, h('a', { href: '/' }, 'Back to the Pokédex')),
    ),
  );
}
