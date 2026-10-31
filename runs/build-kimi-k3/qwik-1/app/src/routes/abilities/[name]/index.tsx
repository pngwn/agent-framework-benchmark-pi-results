import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { apiFetch } from '../../../lib/api';
import { cardsForPokemonRefs } from '../../../lib/data';
import { collapseWhitespace, EM_DASH, englishName, humanize } from '../../../lib/format';
import { CardGrid } from '../../../components/card-grid';
import { NotFound } from '../../../components/not-found';

export const useAbilityData = routeLoader$(async ({ params, status }) => {
  const ability = await apiFetch(`/ability/${encodeURIComponent(params.name.toLowerCase())}/`);
  if (!ability) {
    status(404);
    return null;
  }

  const enEffect = (ability.effect_entries ?? []).find((e: any) => e.language?.name === 'en');
  const effect = enEffect?.short_effect ? collapseWhitespace(enEffect.short_effect) : EM_DASH;

  const refs = (ability.pokemon ?? []).map((p: any) => ({
    name: p.pokemon.name,
    url: p.pokemon.url,
  }));
  const hiddenByUrl = new Map<string, boolean>(
    (ability.pokemon ?? []).map((p: any) => [p.pokemon.url, !!p.is_hidden]),
  );
  const cards = await cardsForPokemonRefs(refs, (ref) => hiddenByUrl.get(ref.url) ?? false);

  return {
    enName: englishName(ability.names) ?? humanize(ability.name),
    effect,
    cards,
  };
});

export default component$(() => {
  const data = useAbilityData();
  const d = data.value;
  if (!d) return <NotFound />;

  return (
    <>
      <h1>{d.enName}</h1>

      <section class="card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{d.effect}</p>
      </section>

      <section class="card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{d.cards.length} Pokémon</p>
        <CardGrid cards={d.cards} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const d = resolveValue(useAbilityData);
  return { title: d ? `${d.enName} – Pokédex` : 'Not found – Pokédex' };
};
