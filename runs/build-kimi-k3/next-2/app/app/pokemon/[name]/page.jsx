import Link from 'next/link';
import { getMove, getPokemon, getSpecies, getVersionGroup, fetchJson } from '../../../lib/api.js';
import {
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavorText,
  statLabel,
} from '../../../lib/format.js';
import { NotFound } from '../../components/NotFound.jsx';
import { Section } from '../../components/Section.jsx';
import { MovesTables } from '../../components/MovesTables.jsx';

export const dynamic = 'force-dynamic';

async function loadSpecies(name) {
  return getSpecies(String(name).toLowerCase());
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const species = await loadSpecies(name);
  return { title: species ? englishName(species) : 'Not found' };
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolves_to.length ? (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionNode key={child.species.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const COLUMNS_WITH_LEVEL = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function methodSortIndex(method) {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

export default async function PokemonPage({ params, searchParams }) {
  const [{ name }, sp] = await Promise.all([params, searchParams]);
  const species = await loadSpecies(name);
  if (!species) return <NotFound />;

  // A species' default Pokémon has the same id as the species.
  const pokemon = await getPokemon(species.id);
  if (!pokemon) return <NotFound />;

  const displayName = englishName(species);
  const genus = species.genera?.find((g) => g.language?.name === 'en')?.genus ?? null;
  const flavorText = latestEnglishFlavorText(species);

  const types = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const abilities = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;

  const evolutionChain = species.evolution_chain?.url ? await fetchJson(species.evolution_chain.url) : null;

  // Version groups in which this Pokémon learns moves, ordered by their order.
  const vgNames = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) vgNames.add(detail.version_group.name);
  }
  const versionGroups = (await Promise.all([...vgNames].map((n) => getVersionGroup(n))))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  const requestedGame = String(sp.game ?? '');
  const selected = versionGroups.some((vg) => vg.name === requestedGame)
    ? requestedGame
    : versionGroups[versionGroups.length - 1]?.name;

  // Rows for the selected version group, grouped by learn method.
  const detailsByMethod = new Map();
  const moveNames = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selected) continue;
      const method = detail.move_learn_method.name;
      if (!detailsByMethod.has(method)) detailsByMethod.set(method, []);
      detailsByMethod.get(method).push({ level: detail.level_learned_at, moveName: move.move.name });
      moveNames.add(move.move.name);
    }
  }

  const moveRecords = new Map();
  await Promise.all(
    [...moveNames].map(async (n) => {
      moveRecords.set(n, await getMove(n));
    }),
  );

  const methods = [...detailsByMethod.keys()].sort(
    (a, b) => methodSortIndex(a) - methodSortIndex(b) || humanize(a).localeCompare(humanize(b)),
  );

  const tables = methods.map((method) => {
    const rows = detailsByMethod.get(method).map((d) => {
      const record = moveRecords.get(d.moveName);
      return {
        level: d.level,
        moveName: d.moveName,
        moveLabel: record ? englishName(record) : humanize(d.moveName),
        typeName: record?.type?.name ?? '',
        typeLabel: humanize(record?.type?.name ?? ''),
        category: humanize(record?.damage_class?.name ?? ''),
        power: record?.power ?? null,
        accuracy: record?.accuracy ?? null,
        pp: record?.pp ?? null,
      };
    });
    rows.sort(
      method === 'level-up'
        ? (a, b) => a.level - b.level || a.moveLabel.localeCompare(b.moveLabel)
        : (a, b) => a.moveLabel.localeCompare(b.moveLabel),
    );
    return {
      method,
      label: humanize(method),
      columns: method === 'level-up' ? COLUMNS_WITH_LEVEL : COLUMNS_WITH_LEVEL.slice(1),
      rows,
    };
  });

  return (
    <>
      <div className="hero">
        <div className="hero-grid">
          {artwork ? <img className="hero-artwork" src={artwork} alt={displayName} /> : null}
          <div>
            <p className="hero-dex">{dexNumber(species.id)}</p>
            <h1>{displayName}</h1>
            {genus ? <p className="hero-genus">{genus}</p> : null}
            <ul className="hero-types">
              {types.map((t) => (
                <li key={t}>
                  <Link className={`type-badge type-${t}`} href={`/types/${t}`}>
                    {humanize(t)}
                  </Link>
                </li>
              ))}
            </ul>
            <dl className="dl-row">
              <div>
                <dt>Height</dt>
                <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
              </div>
            </dl>
          </div>
        </div>
        {flavorText ? <p className="hero-flavor">{flavorText}</p> : null}
      </div>

      <Section heading="Base stats">
        <table className="stats-table">
          <tbody>
            {stats.map((s) => (
              <tr key={s.stat.name}>
                <th scope="row">{statLabel(s.stat.name)}</th>
                <td className="stat-value">{s.base_stat}</td>
                <td>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${Math.min(100, (s.base_stat / 255) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td>
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${Math.min(100, (total / 720) * 100)}%` }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section heading="Abilities">
        <ul className="link-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</Link>
              {a.is_hidden ? <span className="hidden-marker"> (hidden)</span> : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Evolution">
        {evolutionChain?.chain ? (
          <ul className="evolution-list">
            <EvolutionNode node={evolutionChain.chain} />
          </ul>
        ) : null}
      </Section>

      <Section id="moves" heading="Moves">
        {selected ? (
          <MovesTables
            versionGroups={versionGroups.map((vg) => ({ name: vg.name, label: humanize(vg.name) }))}
            selected={selected}
            tables={tables}
          />
        ) : null}
      </Section>
    </>
  );
}
