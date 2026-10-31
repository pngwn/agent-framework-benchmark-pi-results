import { error } from '@sveltejs/kit';
import {
  api,
  setBase,
  humanize,
  enName,
  idFromUrl,
  dexNumber,
  spriteUrl,
  latestEnglishFlavor,
  getSpeciesIndex,
} from '#lib/api.js';

export async function load({ params, parent }) {
  const { apiBase } = await parent();
  setBase(apiBase);

  let ability;
  try {
    ability = await api(`ability/${encodeURIComponent(params.name)}/`);
  } catch (e) {
    if (e.status === 404) error(404, 'Not found');
    throw e;
  }

  const speciesIndex = await getSpeciesIndex();
  const speciesById = new Map(speciesIndex.map((s) => [s.id, s.name]));

  const byId = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    const speciesName = speciesById.get(id);
    if (!speciesName) continue; // alternate form
    const existing = byId.get(id);
    if (existing) {
      existing.hidden = existing.hidden || entry.is_hidden;
    } else {
      byId.set(id, { id, name: speciesName, hidden: entry.is_hidden });
    }
  }

  const cards = [...byId.values()]
    .sort((a, b) => a.id - b.id)
    .map((c) => ({
      ...c,
      human: humanize(c.name),
      dex: dexNumber(c.id),
      sprite: spriteUrl(c.id),
      href: `/pokemon/${c.name}`,
      note: c.hidden ? 'Hidden ability' : null,
    }));

  const enEffects = (ability.effect_entries ?? []).filter((e) => e.language?.name === 'en');
  const effect =
    enEffects.at(-1)?.short_effect ?? latestEnglishFlavor(ability.flavor_text_entries) ?? '—';

  return {
    en: enName(ability.names) ?? humanize(ability.name),
    effect,
    cards,
  };
}
