import { escapeHtml, humanize, englishName } from '../shared/format.js';
import { cardListHtml } from '../shared/cards.js';
import { api, globals, toSpecies, MEDIA_BASE } from '../api.js';

export async function typeListPage() {
  const g = await globals();
  const body = `
<h1>Types</h1>
<ul class="type-list">
  ${g.types
    .map(
      (t) =>
        `<li><a class="type-tile type-${escapeHtml(t.name)}" href="/types/${escapeHtml(t.name)}">${escapeHtml(t.en)}</a></li>`,
    )
    .join('')}
</ul>`;
  return { title: 'Types – Pokédex', h1: 'Types', body };
}

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export async function typePage(name) {
  const type = await api(`/type/${encodeURIComponent(name)}`);
  if (!type) return null;
  const g = await globals();

  const en = englishName(type, type.name);

  const relations = RELATIONS.map(([key, label]) => {
    const refs = type.damage_relations?.[key] ?? [];
    const content = refs.length
      ? refs
          .map(
            (r) =>
              `<a href="/types/${escapeHtml(r.name)}"><span class="type-badge type-${escapeHtml(r.name)}">${escapeHtml(g.typeEn[r.name] ?? humanize(r.name))}</span></a>`,
          )
          .join(' ')
      : 'None';
    return `<div class="fact"><dt>${escapeHtml(label)}</dt><dd>${content}</dd></div>`;
  }).join('');

  const species = toSpecies(type.pokemon ?? [], g.speciesNameById);
  const moves = [...(type.moves ?? [])]
    .map((m) => m.name)
    .sort((a, b) => humanize(a).localeCompare(humanize(b)));

  const body = `
<h1>${escapeHtml(en)}</h1>
<section class="panel" aria-labelledby="relations-heading">
  <h2 id="relations-heading">Damage relations</h2>
  <dl class="facts relations">${relations}</dl>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="result-count">${species.length} Pokémon</p>
  ${cardListHtml(species, { mediaBase: MEDIA_BASE })}
</section>

<section class="panel" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <p class="result-count">${moves.length} moves</p>
  <ul class="move-list">
    ${moves.map((m) => `<li><a href="/moves/${escapeHtml(m)}">${escapeHtml(humanize(m))}</a></li>`).join('')}
  </ul>
</section>`;

  return { title: `${en} – Pokédex`, h1: en, body };
}
