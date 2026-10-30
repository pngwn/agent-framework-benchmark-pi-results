import { mediaUrl, spriteUrl } from './api.js';
import { dexNumber, escapeHtml, humanize, typeToken } from './utils.js';

export function typeBadge(name, { href = null, label } = {}) {
  const token = typeToken(name);
  const text = escapeHtml(label ?? humanize(name));
  const style = `--badge-color: var(--type-${token}, var(--color-text-muted))`;
  const classes = `type-badge type-${token}`;

  if (href) {
    return `<a class="${classes}" style="${style}" href="${escapeHtml(href)}">${text}</a>`;
  }
  return `<span class="${classes}" style="${style}">${text}</span>`;
}

export function pokemonCard({ id, name, sprite, types = null, hidden = false, showTypes = false }) {
  const src = mediaUrl(sprite ?? spriteUrl(id));
  const badges = showTypes
    ? `<span class="type-badges">${(types ?? []).map((type) => typeBadge(type)).join('')}</span>`
    : '';

  return `<li>
    <a class="card" href="/pokemon/${encodeURIComponent(name)}">
      <span class="card-sprite"><img src="${escapeHtml(src)}" alt="" width="96" height="96"></span>
      <span class="dex">${dexNumber(id)}</span>
      <span class="card-name">${escapeHtml(humanize(name))}</span>
      ${badges}
      ${hidden ? '<span class="hidden-ability">Hidden ability</span>' : ''}
    </a>
  </li>`;
}
