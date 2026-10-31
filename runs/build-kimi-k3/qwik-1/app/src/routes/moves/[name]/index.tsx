import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { apiFetch } from '../../../lib/api';
import { cardsForPokemonRefs, getTypes } from '../../../lib/data';
import {
  collapseWhitespace,
  EM_DASH,
  englishName,
  humanize,
} from '../../../lib/format';
import { CardGrid } from '../../../components/card-grid';
import { NotFound } from '../../../components/not-found';

export const useMoveData = routeLoader$(async ({ params, status }) => {
  const move = await apiFetch(`/move/${encodeURIComponent(params.name.toLowerCase())}/`);
  if (!move) {
    status(404);
    return null;
  }

  const types = await getTypes();
  const typeEn = new Map(types.map((t) => [t.name, t.en]));

  const enEffect = (move.effect_entries ?? []).find((e: any) => e.language?.name === 'en');
  const enFlavors = (move.flavor_text_entries ?? []).filter(
    (f: any) => f.language?.name === 'en',
  );
  const effect = enEffect?.short_effect
    ? collapseWhitespace(enEffect.short_effect)
    : enFlavors.length
      ? collapseWhitespace(enFlavors[enFlavors.length - 1].flavor_text)
      : EM_DASH;

  const cards = await cardsForPokemonRefs(move.learned_by_pokemon ?? []);

  return {
    enName: englishName(move.names) ?? humanize(move.name),
    type: move.type?.name ?? '',
    typeEn: move.type?.name ? (typeEn.get(move.type.name) ?? humanize(move.type.name)) : EM_DASH,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : EM_DASH,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
});

export default component$(() => {
  const data = useMoveData();
  const d = data.value;
  if (!d) return <NotFound />;

  return (
    <>
      <h1>{d.enName}</h1>

      <div class="card" style="margin-bottom: var(--space-6)">
        <dl class="kv-list" style="margin: 0">
          <div>
            <dt>Type</dt>
            <dd>
              {d.type ? (
                <a class={`type-badge type-${d.type}`} href={`/types/${d.type}`}>
                  {d.typeEn}
                </a>
              ) : (
                EM_DASH
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{d.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{d.power ?? EM_DASH}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{d.accuracy ?? EM_DASH}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{d.pp ?? EM_DASH}</dd>
          </div>
        </dl>
      </div>

      <section class="card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{d.effect}</p>
      </section>

      <section class="card" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{d.cards.length} Pokémon</p>
        <CardGrid cards={d.cards} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const d = resolveValue(useMoveData);
  return { title: d ? `${d.enName} – Pokédex` : 'Not found – Pokédex' };
};
