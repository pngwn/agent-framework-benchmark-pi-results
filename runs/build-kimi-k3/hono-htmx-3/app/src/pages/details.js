import { html } from 'hono/html';
import { fetchJson, getIndex, idFromUrl } from '../api.js';
import { enName, humanize, lastEnFlavor, MISSING, showNum } from '../util.js';
import { card, cardGrid, layout, titleFor, typeBadge } from '../views.js';

// Map a list of Pokémon references (from move/ability/type data) to unique
// species (alternate forms, ids above 10000, excluded), sorted by dex number.
async function refsToSpecies(refs) {
  const index = await getIndex();
  const seen = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (id >= 10000 || seen.has(id)) continue;
    seen.set(id, { id, name: index.speciesById.get(id) ?? ref.name });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

export async function movePage(c, name) {
  const move = await fetchJson(`/move/${encodeURIComponent(name.toLowerCase())}/`);
  if (!move) return null;
  const index = await getIndex();

  const displayName = enName(move.names) ?? humanize(move.name);
  const enEffect = (move.effect_entries ?? []).find((e) => e.language.name === 'en');
  const effect = enEffect?.short_effect ?? lastEnFlavor(move.flavor_text_entries) ?? MISSING;
  const typeName = move.type?.name ?? '';
  const learners = await refsToSpecies(move.learned_by_pokemon ?? []);

  const content = html`<h1>${displayName}</h1>
<div class="panel facts-panel">
  <dl class="facts">
    <div><dt>Type</dt><dd>${typeName ? typeBadge(typeName, index.typeDisplay.get(typeName) ?? humanize(typeName)) : MISSING}</dd></div>
    <div><dt>Category</dt><dd>${humanize(move.damage_class?.name ?? '') || MISSING}</dd></div>
    <div><dt>Power</dt><dd>${showNum(move.power)}</dd></div>
    <div><dt>Accuracy</dt><dd>${showNum(move.accuracy)}</dd></div>
    <div><dt>PP</dt><dd>${showNum(move.pp)}</dd></div>
  </dl>
</div>
<section class="panel" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>${effect}</p>
</section>
<section class="panel" aria-labelledby="learned-heading">
  <h2 id="learned-heading">Learned by</h2>
  <p class="count">${learners.length} Pokémon</p>
  ${cardGrid(learners.map((s) => card(s)))}
</section>`;

  return c.html(layout(titleFor(displayName), content));
}

export async function abilityPage(c, name) {
  const ability = await fetchJson(`/ability/${encodeURIComponent(name.toLowerCase())}/`);
  if (!ability) return null;
  await getIndex();

  const displayName = enName(ability.names) ?? humanize(ability.name);
  const enEffect = (ability.effect_entries ?? []).find((e) => e.language.name === 'en');
  const effect = enEffect?.short_effect ?? MISSING;

  // Keep one entry per species; remember if any entry is a hidden ability.
  const bySpecies = new Map();
  for (const p of ability.pokemon ?? []) {
    const id = idFromUrl(p.pokemon.url);
    if (id >= 10000) continue;
    const existing = bySpecies.get(id);
    bySpecies.set(id, {
      ref: p.pokemon,
      hidden: Boolean(existing?.hidden || p.is_hidden),
    });
  }
  const entries = [...bySpecies.entries()].sort((a, b) => a[0] - b[0]);
  const speciesList = await refsToSpecies(entries.map(([, e]) => e.ref));
  const hiddenById = new Map(entries.map(([id, e]) => [id, e.hidden]));

  const content = html`<h1>${displayName}</h1>
<section class="panel" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>${effect}</p>
</section>
<section class="panel" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="count">${speciesList.length} Pokémon</p>
  ${cardGrid(
    speciesList.map((s) => card(s, { note: hiddenById.get(s.id) ? 'Hidden ability' : null })),
  )}
</section>`;

  return c.html(layout(titleFor(displayName), content));
}

export async function typesPage(c) {
  const index = await getIndex();
  const content = html`<h1>Types</h1>
<ul class="types-grid">
  ${index.typeNames.map(
    (t) =>
      html`<li><a class="type-tile type-${t}" href="/types/${t}">${index.typeDisplay.get(t) ?? humanize(t)}</a></li>`,
  )}
</ul>`;
  return c.html(layout(titleFor('Types'), content));
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function typePage(c, name) {
  const type = await fetchJson(`/type/${encodeURIComponent(name.toLowerCase())}/`);
  if (!type) return null;
  const index = await getIndex();

  const displayName = enName(type.names) ?? humanize(type.name);
  const species = await refsToSpecies((type.pokemon ?? []).map((p) => p.pokemon));
  const moves = (type.moves ?? [])
    .map((m) => m.name)
    .sort((a, b) => humanize(a).localeCompare(humanize(b)));

  const content = html`<h1>${displayName}</h1>
<section class="panel" aria-labelledby="relations-heading">
  <h2 id="relations-heading">Damage relations</h2>
  <dl class="relations">
    ${RELATIONS.map(([term, key]) => {
      const related = type.damage_relations?.[key] ?? [];
      return html`<div>
      <dt>${term}</dt>
      <dd>${
        related.length
          ? html`<span class="badges">${related.map((t) =>
              typeBadge(t.name, index.typeDisplay.get(t.name) ?? humanize(t.name)),
            )}</span>`
          : 'None'
      }</dd>
    </div>`;
    })}
  </dl>
</section>
<section class="panel" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="count">${species.length} Pokémon</p>
  ${cardGrid(species.map((s) => card(s)))}
</section>
<section class="panel" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <p class="count">${moves.length} moves</p>
  <ul class="moves-list">
    ${moves.map((m) => html`<li><a href="/moves/${m}">${humanize(m)}</a></li>`)}
  </ul>
</section>`;

  return c.html(layout(titleFor(displayName), content));
}
