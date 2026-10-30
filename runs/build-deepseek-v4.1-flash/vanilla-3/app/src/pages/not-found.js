import { el, heading } from '../ui.js';

export function renderNotFound() {
  return {
    title: 'Not found – Pokédex',
    content: el(
      'div',
      { class: 'not-found-page' },
      heading(1, 'Not found'),
      el('p', {}, el('a', { href: '/', text: 'Back to the Pokédex' })),
    ),
  };
}
