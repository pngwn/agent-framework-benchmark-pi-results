import Link from 'next/link';
import { notFound } from 'next/navigation';
import MovesSection from '../../../components/MovesSection.jsx';
import Section from '../../../components/Section.jsx';
import TypeBadge from '../../../components/TypeBadge.jsx';
import { apiGet, fetchJson } from '../../../lib/api.js';
import { getTypeEnMap, getVersionGroupOrders } from '../../../lib/data.js';
import {
  englishGenus,
  englishName,
  humanize,
  latestEnglishFlavor,
  dexNumber,
} from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? '';

async function getSpecies(name) {
  return apiGet(`pokemon-species/${encodeURIComponent(name)}`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const species = await getSpecies(name);
  return { title: species ? englishName(species) : 'Not found' };
}

// Builds the game options and the per-learn-method move tables for the
// selected version group.
async function buildMoves(pokemon, gameParam) {
  const [orders, typeEn] = await Promise.all([getVersionGroupOrders(), getTypeEnMap()]);

  const gameNames = [
    ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ];
  const games = gameNames
    .map((name) => ({ name, label: humanize(name), order: orders.get(name) ?? 0 }))
    .sort((a, b) => a.order - b.order);
  if (games.length === 0) return { games, selected: null, methods: [] };
  const selected = games.some((g) => g.name === gameParam) ? gameParam : games.at(-1).name;

  // Collect (method, move, level) entries for the selected version group.
  const seen = new Map();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected) continue;
      const key = `${d.move_learn_method.name}|${m.move.name}`;
      const existing = seen.get(key);
      if (!existing || d.level_learned_at < existing.level) {
        seen.set(key, { method: d.move_learn_method.name, move: m.move.name, level: d.level_learned_at });
      }
    }
  }

  const moveNames = [...new Set([...seen.values()].map((r) => r.move))];
  const records = await Promise.all(moveNames.map((n) => apiGet(`move/${n}`)));
  const byName = new Map(moveNames.map((n, i) => [n, records[i]]));

  const byMethod = new Map();
  for (const r of seen.values()) {
    const rec = byName.get(r.move);
    const row = {
      level: r.level,
      moveName: r.move,
      moveEn: rec ? englishName(rec) : humanize(r.move),
      typeName: rec?.type?.name ?? '',
      typeEn: typeEn.get(rec?.type?.name) ?? humanize(rec?.type?.name ?? ''),
      category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : '',
      power: rec?.power ?? null,
      accuracy: rec?.accuracy ?? null,
      pp: rec?.pp ?? null,
    };
    if (!byMethod.has(r.method)) byMethod.set(r.method, []);
    byMethod.get(r.method).push(row);
  }

  const orderedKeys = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const methods = orderedKeys.map((key) => ({
    key,
    label: humanize(key),
    hasLevel: key === 'level-up',
    rows: byMethod
      .get(key)
      .sort(
        key === 'level-up'
          ? (x, y) => x.level - y.level || x.moveEn.localeCompare(y.moveEn)
          : (x, y) => x.moveEn.localeCompare(y.moveEn),
      ),
  }));

  return { games, selected, methods };
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolves_to?.length > 0 && (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionNode key={child.species.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function PokemonPage({ params, searchParams }) {
  const { name } = await params;
  const sp = await searchParams;
  const species = await getSpecies(name);
  if (!species) notFound();

  const defaultVariety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0];
  const pokemon = defaultVariety ? await apiGet(`pokemon/${defaultVariety.pokemon.name}`) : null;
  if (!pokemon) notFound();

  const [chain, typeEn, moves] = await Promise.all([
    species.evolution_chain?.url ? fetchJson(species.evolution_chain.url) : null,
    getTypeEnMap(),
    buildMoves(pokemon, first(sp.game)),
  ]);

  const title = englishName(species);
  const genus = englishGenus(species);
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const types = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot);
  const abilities = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);
  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;

  return (
    <>
      <div className="summary">
        <div className="artwork">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {artwork && <img src={artwork} alt={title} width={288} height={288} />}
        </div>
        <div>
          <p className="summary-dex">{dexNumber(species.id)}</p>
          <h1>{title}</h1>
          {genus && <p className="genus">{genus}</p>}
          <div className="summary-types">
            {types.map((t) => (
              <TypeBadge
                key={t.type.name}
                name={t.type.name}
                label={typeEn.get(t.type.name) ?? humanize(t.type.name)}
                href={`/types/${t.type.name}`}
              />
            ))}
          </div>
          <dl className="dims">
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
      {flavor && <p className="flavor">{flavor}</p>}

      <Section id="stats" title="Base stats">
        <table className="stats">
          <tbody>
            {stats.map((s) => (
              <tr key={s.stat.name}>
                <th scope="row">{STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
                <td className="stat-value">{s.base_stat}</td>
                <td>
                  <div className="bar-track" aria-hidden="true">
                    <div className="bar-fill" style={{ width: `${Math.min(100, (s.base_stat / 255) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr className="total">
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td>
                <div className="bar-track" aria-hidden="true">
                  <div className="bar-fill" style={{ width: `${Math.min(100, (total / 720) * 100)}%` }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="link-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</Link>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      {chain && (
        <Section id="evolution" title="Evolution">
          <ul className="link-list">
            <EvolutionNode node={chain.chain} />
          </ul>
        </Section>
      )}

      <Section id="moves" title="Moves">
        <MovesSection games={moves.games} selected={moves.selected} methods={moves.methods} />
      </Section>
    </>
  );
}
