import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFoundContent } from '../../../components/not-found';
import { CardGrid } from '../../../components/pokemon-card';
import { Section } from '../../../components/section';
import { api } from '../../../lib/api';
import { cardsForPokemonRefs, getTypes } from '../../../lib/data';
import { englishName, humanize, latestEnglishFlavorText } from '../../../lib/util';

export const useMoveData = routeLoader$(async (ev) => {
  const name = ev.params.name.toLowerCase();
  const move = await api(`move/${name}`);
  if (!move) {
    ev.status(404);
    return null;
  }
  const types = await getTypes();
  const typeLabel = new Map<string, string>(types.map((t) => [t.name, t.label]));

  const shortEffect = move.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect;
  const effect = shortEffect
    ? String(shortEffect).replace(/\s+/g, ' ').trim()
    : (latestEnglishFlavorText(move.flavor_text_entries) ?? '—');

  const cards = await cardsForPokemonRefs(move.learned_by_pokemon ?? []);

  return {
    heading: englishName(move.names) ?? humanize(move.name),
    typeName: move.type?.name ?? '',
    typeLabel: move.type?.name ? (typeLabel.get(move.type.name) ?? humanize(move.type.name)) : '—',
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMoveData);
  return { title: data ? `${data.heading} – Pokédex` : 'Not found – Pokédex' };
};

export default component$(() => {
  const data = useMoveData();
  const d = data.value;
  if (!d) return <NotFoundContent />;

  return (
    <>
      <h1>{d.heading}</h1>
      <div class="section detail-section">
        <dl class="pairs">
          <div>
            <dt>Type</dt>
            <dd>
              {d.typeName ? (
                <a class={`type-badge type-${d.typeName}`} href={`/types/${d.typeName}`}>
                  {d.typeLabel}
                </a>
              ) : (
                d.typeLabel
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{d.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{d.power ?? '—'}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{d.accuracy ?? '—'}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{d.pp ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <Section title="Effect" headingId="effect-heading">
        <p>{d.effect}</p>
      </Section>

      <Section title="Learned by" headingId="learned-by-heading">
        <p class="count">{d.cards.length} Pokémon</p>
        <CardGrid cards={d.cards} />
      </Section>
    </>
  );
});
