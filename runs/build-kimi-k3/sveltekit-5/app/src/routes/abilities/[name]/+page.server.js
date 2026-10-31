import { error } from '@sveltejs/kit';
import { api, getIndex, spriteUrl } from '#lib/server/api.js';
import { dexNumber, englishName, englishShortEffect, humanize, urlId } from '#lib/utils.js';

export async function load({ params }) {
  let ability;
  try {
    ability = await api(`ability/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const index = await getIndex();
  const speciesById = new Map(index.species.map((s) => [s.id, s]));

  // Map Pokémon to their species, leaving out alternate forms. A species has
  // the ability as hidden only if every occurrence has it as hidden.
  const bySpecies = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = urlId(entry.pokemon.url);
    if (id == null || id >= 10000) continue;
    const species = speciesById.get(id);
    if (!species) continue;
    const existing = bySpecies.get(id);
    bySpecies.set(id, {
      species,
      hidden: existing ? existing.hidden && entry.is_hidden : entry.is_hidden
    });
  }

  const cards = [...bySpecies.values()]
    .sort((a, b) => a.species.id - b.species.id)
    .map(({ species, hidden }) => ({
      id: species.id,
      name: species.name,
      human: species.human,
      dex: species.dex ?? dexNumber(species.id),
      sprite: species.sprite ?? spriteUrl(species.id),
      href: `/pokemon/${species.name}`,
      hidden
    }));

  return {
    view: {
      name: englishName(ability.names, humanize(ability.name)),
      effect: englishShortEffect(ability.effect_entries) ?? '—',
      cards
    }
  };
}
