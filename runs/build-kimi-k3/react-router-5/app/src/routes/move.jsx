import { data, Link } from 'react-router';
import { apiBase, apiGet, getTypeData, speciesCards } from '../lib/api.server.js';
import { englishName, humanize, latestEnFlavor } from '../lib/util.js';
import { CardList, Section } from '../lib/components.jsx';

export async function loader({ params }) {
  const move = await apiGet(`/move/${encodeURIComponent(params.name)}`);
  if (!move) throw data('Not Found', { status: 404 });
  const typeData = await getTypeData();
  const effect =
    move.effect_entries.find((e) => e.language?.name === 'en')?.short_effect ??
    latestEnFlavor(move.flavor_text_entries) ??
    '—';
  const cards = await speciesCards(move.learned_by_pokemon ?? []);
  return {
    apiBase,
    name: englishName(move.names, move.name),
    type: {
      name: move.type.name,
      en: typeData.byName.get(move.type.name)?.en ?? humanize(move.type.name),
    },
    category: humanize(move.damage_class.name),
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    cards,
  };
}

export function meta({ loaderData }) {
  return [{ title: `${loaderData.name} – Pokédex` }];
}

const missing = (value) => (value == null ? '—' : value);

export default function MovePage({ loaderData }) {
  const d = loaderData;
  return (
    <>
      <h1>{d.name}</h1>
      <div className="panel">
        <dl className="facts move-facts">
          <div>
            <dt>Type</dt>
            <dd>
              <Link to={`/types/${d.type.name}`} className={`type-badge type-${d.type.name}`}>
                {d.type.en}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{d.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{missing(d.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{missing(d.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{missing(d.pp)}</dd>
          </div>
        </dl>
      </div>

      <Section id="effect" title="Effect">
        <p>{d.effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{d.cards.length} Pokémon</p>
        <CardList apiBase={d.apiBase} items={d.cards} />
      </Section>
    </>
  );
}
