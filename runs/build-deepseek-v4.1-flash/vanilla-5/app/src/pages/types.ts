import { fetchRecord } from '../api';
import { cardList, typeBadgeLink } from '../cards';
import { h, section } from '../dom';
import { loadAllTypes, loadSpeciesByIdMap, parseIdFromRef } from '../data';
import { englishName, humanize, typeClassName } from '../format';
import type { PageContext } from '../types';

export async function renderTypes(ctx: PageContext): Promise<void> {
  const types = await loadAllTypes();
  if (!ctx.isCurrent()) return;
  ctx.setTitle('Types – Pokédex');

  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      h('h1', {}, 'Types'),
      h(
        'ul',
        { class: 'type-list' },
        ...types.map((type) =>
          h(
            'li',
            {},
            h(
              'a',
              {
                class: `type-tile ${typeClassName(type.name)}`,
                href: `/types/${encodeURIComponent(type.name)}`,
              },
              type.englishName,
            ),
          ),
        ),
      ),
    ),
  );
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

export async function renderType(ctx: PageContext, name: string): Promise<void> {
  const [type, speciesById] = await Promise.all([
    fetchRecord(`type/${encodeURIComponent(name)}`),
    loadSpeciesByIdMap(),
  ]);
  if (!ctx.isCurrent()) return;

  const titleName = englishName(type, name);
  ctx.setTitle(`${titleName} – Pokédex`);
  const relations = h(
    'dl',
    { class: 'relations' },
    ...RELATIONS.map(([term, key]) => {
      const refs = Array.isArray(type.damage_relations?.[key]) ? type.damage_relations[key] : [];
      const value = refs.length
        ? h(
            'span',
            { class: 'relation-links' },
            ...refs.map((ref: { name: string }) => typeBadgeLink(ref.name)),
          )
        : 'None';
      return h('div', { class: 'relation' }, h('dt', {}, term), h('dd', {}, value));
    }),
  );

  const pokemonIds: number[] = [];
  for (const entry of type.pokemon ?? []) {
    const id = parseIdFromRef(entry.pokemon);
    if (id === null || id > 10000 || pokemonIds.includes(id)) continue;
    pokemonIds.push(id);
  }
  pokemonIds.sort((a, b) => a - b);
  const pokemonSpecies = pokemonIds.map((id) => {
    const species = speciesById.get(id);
    return { id, name: species?.name ?? String(id) };
  });

  const moves = [...(type.moves ?? [])].sort(
    (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name),
  );

  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      h('h1', {}, titleName),
      section('damage-relations-section', 'Damage relations', relations),
      section(
        'type-pokemon-section',
        'Pokémon',
        h('p', { class: 'result-count' }, `${pokemonSpecies.length} Pokémon`),
        cardList(pokemonSpecies),
      ),
      section(
        'type-moves-section',
        'Moves',
        h('p', { class: 'result-count' }, `${moves.length} moves`),
        h(
          'ul',
          { class: 'moves-list' },
          ...moves.map((move: { name: string }) =>
            h(
              'li',
              {},
              h('a', { href: `/moves/${encodeURIComponent(move.name)}` }, humanize(move.name)),
            ),
          ),
        ),
      ),
    ),
  );
}
