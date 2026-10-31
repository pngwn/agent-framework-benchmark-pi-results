import {
  move as fetchMove, ability as fetchAbility, type as fetchType, pokemon as fetchPokemon,
  typeList, idFromUrl, humanize, englishName, englishShortEffect, latestEnglishFlavorText,
  fetchAll,
} from '../api.js';
import { html, layout, pageDocTitle, section, pokemonCard, cardList, typeBadge } from '../render.js';

const num = (v) => (v == null ? '—' : String(v));

// Build card data for a list of Pokémon references ({name, url}), excluding
// alternate forms (Pokémon IDs above 10000) and mapping to species.
async function cardsForPokemonRefs(refs, hiddenFlags = null) {
  const kept = refs
    .map((ref, i) => ({ ref, id: idFromUrl(ref.url ?? ref.pokemon?.url), i }))
    .filter((e) => e.id && e.id <= 10000);
  const cards = await fetchAll(kept, async (e) => {
    const p = await fetchPokemon(e.id);
    if (!p) return null;
    return pokemonCard({
      speciesName: p.species.name,
      id: idFromUrl(p.species.url),
      spriteUrl: p.sprites?.front_default ?? '',
      hidden: hiddenFlags ? hiddenFlags[e.i] : false,
    });
  });
  return cards.filter(Boolean);
}

export async function movePage(c) {
  const name = c.req.param('name');
  const m = await fetchMove(name);
  if (!m) return null;

  const types = await typeList();
  const typeEnglish = new Map(types.map((t) => [t.name, t.englishName]));
  const title = englishName(m) ?? humanize(m.name);
  const typeName = m.type?.name ?? '';
  const effect = englishShortEffect(m) ?? latestEnglishFlavorText(m) ?? '—';

  const cards = await cardsForPokemonRefs(m.learned_by_pokemon ?? []);

  return c.html(layout({
    docTitle: pageDocTitle(title),
    content: html`
      <h1>${title}</h1>
      <div class="section">
        <dl class="facts facts-wide">
          <div><dt>Type</dt><dd>${typeName ? typeBadge(typeName, typeEnglish.get(typeName) ?? humanize(typeName)) : '—'}</dd></div>
          <div><dt>Category</dt><dd>${m.damage_class?.name ? humanize(m.damage_class.name) : '—'}</dd></div>
          <div><dt>Power</dt><dd>${num(m.power)}</dd></div>
          <div><dt>Accuracy</dt><dd>${num(m.accuracy)}</dd></div>
          <div><dt>PP</dt><dd>${num(m.pp)}</dd></div>
        </dl>
      </div>
      ${section('Effect', html`<p>${effect}</p>`)}
      ${section('Learned by', html`
        <p class="result-count">${cards.length} Pokémon</p>
        ${cardList(cards)}
      `)}
    `,
  }));
}

export async function abilityPage(c) {
  const name = c.req.param('name');
  const a = await fetchAbility(name);
  if (!a) return null;

  const title = englishName(a) ?? humanize(a.name);
  const effect = englishShortEffect(a) ?? '—';

  const entries = a.pokemon ?? [];
  const cards = await cardsForPokemonRefs(
    entries.map((e) => e.pokemon),
    entries.map((e) => e.is_hidden),
  );

  return c.html(layout({
    docTitle: pageDocTitle(title),
    content: html`
      <h1>${title}</h1>
      ${section('Effect', html`<p>${effect}</p>`)}
      ${section('Pokémon', html`
        <p class="result-count">${cards.length} Pokémon</p>
        ${cardList(cards)}
      `)}
    `,
  }));
}

const DAMAGE_RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function typeListPage(c) {
  const types = await typeList();
  return c.html(layout({
    docTitle: pageDocTitle('Types'),
    content: html`
      <h1>Types</h1>
      <ul class="type-list">
        ${types.map((t) => html`
          <li><a class="type-tile" style="background-color: var(--type-${t.name}, var(--color-text-muted))" href="/types/${t.name}">${t.englishName}</a></li>
        `)}
      </ul>
    `,
  }));
}

export async function typePage(c) {
  const name = c.req.param('name');
  const t = await fetchType(name);
  if (!t) return null;

  const types = await typeList();
  const typeEnglish = new Map(types.map((x) => [x.name, x.englishName]));
  const label = (n) => typeEnglish.get(n) ?? humanize(n);
  const title = englishName(t) ?? humanize(t.name);

  const relations = DAMAGE_RELATIONS.map(([term, key]) => {
    const related = t.damage_relations?.[key] ?? [];
    return { term, related };
  });

  const cards = await cardsForPokemonRefs((t.pokemon ?? []).map((e) => e.pokemon));

  const moves = (t.moves ?? [])
    .map((m) => m.name)
    .sort((a, b) => humanize(a).localeCompare(humanize(b)));

  return c.html(layout({
    docTitle: pageDocTitle(title),
    content: html`
      <h1>${title}</h1>
      ${section('Damage relations', html`
        <dl class="damage-relations">
          ${relations.map((r) => html`
            <div>
              <dt>${r.term}</dt>
              <dd>${r.related.length
                ? html`<span class="card-types">${r.related.map((x) => typeBadge(x.name, label(x.name)))}</span>`
                : 'None'}</dd>
            </div>
          `)}
        </dl>
      `)}
      ${section('Pokémon', html`
        <p class="result-count">${cards.length} Pokémon</p>
        ${cardList(cards)}
      `)}
      ${section('Moves', html`
        <p class="result-count">${moves.length} moves</p>
        <ul class="moves-list">
          ${moves.map((m) => html`<li><a href="/moves/${m}">${humanize(m)}</a></li>`)}
        </ul>
      `)}
    `,
  }));
}
