import { fetchRecord } from '../api';
import { cardList } from '../cards';
import { h, section } from '../dom';
import { loadSpeciesByIdMap, parseIdFromRef } from '../data';
import { englishName, englishShortEffect } from '../format';
import type { PageContext } from '../types';

export async function renderAbility(ctx: PageContext, name: string): Promise<void> {
  const [ability, speciesById] = await Promise.all([
    fetchRecord(`ability/${encodeURIComponent(name)}`),
    loadSpeciesByIdMap(),
  ]);
  if (!ctx.isCurrent()) return;

  const titleName = englishName(ability, ability.name);
  ctx.setTitle(`${titleName} – Pokédex`);

  const hiddenById = new Map<number, boolean>();
  const ids: number[] = [];
  for (const entry of ability.pokemon ?? []) {
    const id = parseIdFromRef(entry.pokemon);
    if (id === null || id > 10000) continue;
    if (!ids.includes(id)) ids.push(id);
    if (entry.is_hidden) hiddenById.set(id, true);
    else if (!hiddenById.has(id)) hiddenById.set(id, false);
  }
  ids.sort((a, b) => a - b);

  const pokemonSpecies = ids.map((id) => {
    const species = speciesById.get(id);
    return { id, name: species?.name ?? String(id) };
  });

  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      h('h1', {}, titleName),
      section('effect-section', 'Effect', h('p', {}, englishShortEffect(ability) || '—')),
      section(
        'ability-pokemon-section',
        'Pokémon',
        h('p', { class: 'result-count' }, `${pokemonSpecies.length} Pokémon`),
        cardList(pokemonSpecies, (species) => ({ hiddenAbility: hiddenById.get(species.id) === true })),
      ),
    ),
  );
}
