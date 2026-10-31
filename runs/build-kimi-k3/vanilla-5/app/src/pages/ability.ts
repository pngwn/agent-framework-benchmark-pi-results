import { apiJson, isNotFound } from '../api';
import { getSpeciesNames } from '../data';
import { cardList, pokemonCard, section } from '../components';
import { DASH, enName, enShortEffect, esc, idFromUrl, isDefaultPokemonId } from '../util';
import { renderNotFound } from './notFound';

export async function renderAbility(root: HTMLElement, name: string): Promise<void> {
  let ability: any;
  try {
    ability = await apiJson(`/ability/${encodeURIComponent(name)}`);
  } catch (e) {
    if (isNotFound(e)) return renderNotFound(root);
    throw e;
  }

  const speciesNames = await getSpeciesNames();

  // Map Pokémon to their species, dropping alternate forms; remember which
  // species have this as a hidden ability.
  const bySpecies = new Map<number, { name: string; hidden: boolean }>();
  const entries = [...(ability.pokemon ?? [])].sort(
    (a, b) => idFromUrl(a.pokemon?.url ?? '') - idFromUrl(b.pokemon?.url ?? ''),
  );
  for (const entry of entries) {
    const pid = idFromUrl(entry.pokemon?.url ?? '');
    if (!isDefaultPokemonId(pid) || bySpecies.has(pid)) continue;
    bySpecies.set(pid, {
      name: speciesNames.get(pid) ?? entry.pokemon?.name ?? '',
      hidden: !!entry.is_hidden,
    });
  }
  const species = [...bySpecies.entries()]
    .map(([id, v]) => ({ id, name: v.name, hidden: v.hidden }))
    .sort((a, b) => a.id - b.id);

  const title = enName(ability);
  document.title = `${title} – Pokédex`;

  root.innerHTML =
    `<h1>${esc(title)}</h1>` +
    section('Effect', `<p>${esc(enShortEffect(ability) ?? DASH)}</p>`) +
    section(
      'Pokémon',
      `<p class="count">${species.length} Pokémon</p>` +
        (species.length
          ? cardList(species.map((sp) => pokemonCard(sp, { note: sp.hidden ? 'Hidden ability' : undefined })))
          : `<p>${DASH}</p>`),
    );
}
