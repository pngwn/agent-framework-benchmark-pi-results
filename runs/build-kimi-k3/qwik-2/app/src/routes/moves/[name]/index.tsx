import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '~/components/not-found';
import { PokemonCardList } from '~/components/pokemon-card';
import { Section } from '~/components/section';
import { apiOrNull } from '~/lib/api';
import { cardsForPokemonRefs, getTypeList } from '~/lib/data';
import {
  EM_DASH,
  englishName,
  humanize,
  latestEnglishFlavorText,
  showMissing,
} from '~/lib/format';

export const useMove = routeLoader$(async (ev) => {
  const name = decodeURIComponent(ev.params.name).toLowerCase();
  const move = await apiOrNull(`/move/${encodeURIComponent(name)}/`);
  if (!move) {
    ev.status(404);
    return null;
  }
  const [typeList, learnedBy] = await Promise.all([
    getTypeList(),
    cardsForPokemonRefs(move.learned_by_pokemon as any[]),
  ]);
  const typeEnglish = new Map(typeList.map((t) => [t.name, t.english]));

  const effectEntry = (move.effect_entries as any[]).find((e) => e.language?.name === 'en');
  const effect =
    effectEntry?.short_effect?.replace(/\s+/g, ' ').trim() ??
    latestEnglishFlavorText(move.flavor_text_entries) ??
    EM_DASH;

  return {
    english: englishName(move.names, move.name),
    type: {
      name: move.type.name as string,
      english: typeEnglish.get(move.type.name) ?? humanize(move.type.name),
    },
    category: humanize(move.damage_class.name),
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect,
    learnedBy,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMove);
  return {
    title: data ? `${data.english} – Pokédex` : 'Not found – Pokédex',
  };
};

export default component$(() => {
  const data = useMove().value;
  if (!data) return <NotFound />;

  return (
    <>
      <h1>{data.english}</h1>
      <div class="section section-flush">
        <dl class="facts facts-five">
          <div>
            <dt>Type</dt>
            <dd>
              <a class={`type-badge type-${data.type.name}`} href={`/types/${data.type.name}`}>
                {data.type.english}
              </a>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{showMissing(data.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{showMissing(data.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{showMissing(data.pp)}</dd>
          </div>
        </dl>
      </div>

      <Section headingId="effect-heading" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section headingId="learned-by-heading" title="Learned by">
        <p class="count">{data.learnedBy.length} Pokémon</p>
        <PokemonCardList cards={data.learnedBy} />
      </Section>
    </>
  );
});
