import {
  englishName,
  englishShortEffect,
  getAbility,
  getSpeciesMaps,
  parseId,
  speciesCardInfo,
} from '../api.js';
import { el, heading, panel, pokemonCard, pokemonGrid } from '../ui.js';

export async function renderAbility(_main, _searchParams, isCurrent, name) {
  let ability;
  try {
    ability = await getAbility(name);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }

  const maps = await getSpeciesMaps();
  if (!isCurrent()) return null;

  const byId = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = parseId(entry.pokemon?.url);
    if (id === null || id > 10000) continue;
    const existing = byId.get(id);
    if (existing) {
      existing.hidden = existing.hidden || Boolean(entry.is_hidden);
      continue;
    }
    byId.set(id, {
      info: speciesCardInfo(entry.pokemon, maps),
      hidden: Boolean(entry.is_hidden),
    });
  }
  const entries = [...byId.values()].sort((a, b) => a.info.id - b.info.id);
  const displayName = englishName(ability);

  const pokemonPanel = panel(
    2,
    'Pokémon',
    'pokemon',
    el('p', { class: 'count-text', text: `${entries.length} Pokémon` }),
    pokemonGrid(
      entries.map((entry) =>
        pokemonCard(entry.info, {
          hidden: entry.hidden,
        }),
      ),
    ),
  );

  return {
    title: `${displayName} – Pokédex`,
    content: el(
      'div',
      { class: 'ability-page' },
      heading(1, displayName),
      panel(
        2,
        'Effect',
        'effect',
        el('p', { class: 'effect-text', text: englishShortEffect(ability) ?? '—' }),
      ),
      pokemonPanel,
    ),
  };
}
