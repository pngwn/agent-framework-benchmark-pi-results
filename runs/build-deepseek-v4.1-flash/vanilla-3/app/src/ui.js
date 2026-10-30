import { formatDex, spriteUrl } from './api.js';

export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        if (dataValue !== undefined && dataValue !== null) node.dataset[dataKey] = dataValue;
      }
    } else if (key === 'style') {
      node.setAttribute('style', value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, value);
    }
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

export function heading(level, text, id) {
  return el(`h${level}`, { id, text });
}

export function panel(headingLevel, title, id, ...children) {
  const headingId = `${id}-heading`;
  return el(
    'section',
    { class: 'panel', id, 'aria-labelledby': headingId },
    heading(headingLevel, title, headingId),
    ...children,
  );
}

export function pokemonCard(info, options = {}) {
  const { showTypes = false, hidden = false } = options;
  const link = el(
    'a',
    {
      class: 'pokemon-card-link',
      href: `/pokemon/${encodeURIComponent(info.slug)}`,
    },
    el('img', {
      class: 'card-sprite',
      src: info.sprite ?? spriteUrl(info.id),
      alt: '',
      'data-sprite-id': info.id,
      loading: 'lazy',
    }),
    el('span', { class: 'card-dex', text: formatDex(info.id) }),
    el('span', { class: 'card-name', text: info.label }),
  );

  const extra = [];
  if (hidden) extra.push(el('span', { class: 'card-hidden', text: 'Hidden ability' }));
  if (showTypes && info.types?.length) {
    extra.push(
      el(
        'div',
        { class: 'card-types' },
        info.types.map((type) => typeBadge(type.slug, type.label, { link: false })),
      ),
    );
  }

  return el('li', { class: 'pokemon-card' }, link, ...extra);
}

export function pokemonGrid(cards) {
  return el('ul', { class: 'pokemon-grid' }, cards);
}

export function typeBadge(slug, label, options = {}) {
  const className = `type-badge type-${slug}`;
  if (options.link !== false) {
    return el('a', {
      class: className,
      href: `/types/${encodeURIComponent(slug)}`,
      text: label,
    });
  }
  return el('span', { class: className, text: label });
}
