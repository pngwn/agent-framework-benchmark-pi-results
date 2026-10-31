import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { apiGet, getSpeciesNameById, getTypeIndex, idFromUrl, isDefaultPokemonId, spriteUrl } from '../../../lib/api';
import { englishName, humanize, latestEnglishFlavorText, orDash } from '../../../lib/format';
import { NotFound } from '../../../components/not-found';
import { PokemonCards, type CardData } from '../../../components/pokemon-cards';

export const useMoveData = routeLoader$(async ({ params, status }) => {
  const move = await apiGet(`move/${encodeURIComponent(params.name.toLowerCase())}/`);
  if (!move) {
    status(404);
    return null;
  }

  const [typeIndex, speciesById] = await Promise.all([getTypeIndex(), getSpeciesNameById()]);

  // Effect: English short_effect, else latest English flavor text, else em dash.
  const shortEffect = (move.effect_entries ?? []).find((e: any) => e.language?.name === 'en')?.short_effect ?? null;
  const effect = shortEffect ?? latestEnglishFlavorText(move.flavor_text_entries) ?? '—';

  // Learned by: map Pokémon to their species; leave out alternate forms.
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const p of move.learned_by_pokemon ?? []) {
    const id = idFromUrl(p.url ?? '');
    if (!isDefaultPokemonId(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  ids.sort((a, b) => a - b);

  const cards: CardData[] = ids
    .filter((id) => speciesById.has(id))
    .map((id) => ({ name: speciesById.get(id)!, id, sprite: spriteUrl(id) }));

  const typeName: string | null = move.type?.name ?? null;

  return {
    name: englishName(move.names) ?? humanize(move.name),
    type: typeName ? { name: typeName, label: typeIndex.byName.get(typeName)?.label ?? humanize(typeName) } : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
});

export default component$(() => {
  const data = useMoveData();
  if (!data.value) {
    return <NotFound />;
  }
  const d = data.value;

  return (
    <>
      <h1>{d.name}</h1>
      <div class="card-section">
        <dl class="fact-grid">
          <div>
            <dt>Type</dt>
            <dd>
              {d.type ? (
                <a class="type-badge" data-type={d.type.name} href={`/types/${d.type.name}`}>
                  {d.type.label}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{d.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{orDash(d.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{orDash(d.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{orDash(d.pp)}</dd>
          </div>
        </dl>
      </div>

      <section class="card-section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{d.effect}</p>
      </section>

      <section class="card-section" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count-text">{d.cards.length} Pokémon</p>
        <PokemonCards cards={d.cards} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMoveData);
  return {
    title: data ? `${data.name} – Pokédex` : 'Not found – Pokédex',
  };
};
