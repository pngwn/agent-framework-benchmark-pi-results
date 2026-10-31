import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { apiGet, getSpeciesNameById, idFromUrl, isDefaultPokemonId, spriteUrl } from '../../../lib/api';
import { englishName, humanize } from '../../../lib/format';
import { NotFound } from '../../../components/not-found';
import { PokemonCards, type CardData } from '../../../components/pokemon-cards';

export const useAbilityData = routeLoader$(async ({ params, status }) => {
  const ability = await apiGet(`ability/${encodeURIComponent(params.name.toLowerCase())}/`);
  if (!ability) {
    status(404);
    return null;
  }

  const speciesById = await getSpeciesNameById();

  const effect =
    (ability.effect_entries ?? []).find((e: any) => e.language?.name === 'en')?.short_effect ?? '—';

  // Pokémon with this ability; alternate forms are excluded.
  const byId = new Map<number, boolean>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url ?? '');
    if (!isDefaultPokemonId(id)) continue;
    if (!byId.has(id)) byId.set(id, !!entry.is_hidden);
  }
  const ids = [...byId.keys()].sort((a, b) => a - b);

  const cards: CardData[] = ids
    .filter((id) => speciesById.has(id))
    .map((id) => ({
      name: speciesById.get(id)!,
      id,
      sprite: spriteUrl(id),
      note: byId.get(id) ? 'Hidden ability' : undefined,
    }));

  return {
    name: englishName(ability.names) ?? humanize(ability.name),
    effect,
    cards,
  };
});

export default component$(() => {
  const data = useAbilityData();
  if (!data.value) {
    return <NotFound />;
  }
  const d = data.value;

  return (
    <>
      <h1>{d.name}</h1>
      <section class="card-section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{d.effect}</p>
      </section>

      <section class="card-section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count-text">{d.cards.length} Pokémon</p>
        <PokemonCards cards={d.cards} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityData);
  return {
    title: data ? `${data.name} – Pokédex` : 'Not found – Pokédex',
  };
};
