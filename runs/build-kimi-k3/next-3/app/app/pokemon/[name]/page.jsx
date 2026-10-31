import { cache } from 'react';
import Link from 'next/link';
import { apiFetch, fetchMany } from '../../../lib/api.js';
import { getTypeLabels, getVersionGroups } from '../../../lib/data.js';
import {
  MISSING,
  collapseWhitespace,
  dexNumber,
  englishGenus,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '../../../lib/format.js';
import { NotFound, Section } from '../../../lib/components.jsx';
import MovesSection from './MovesSection.jsx';

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

const loadPokemon = cache(async (rawName) => {
  const name = decodeURIComponent(rawName).toLowerCase();
  const species = await apiFetch(`/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return null;
  const defaultVariety =
    (species.varieties ?? []).find((v) => v.is_default) ?? (species.varieties ?? [])[0];
  const pokemonId = idFromUrl(defaultVariety?.pokemon?.url) ?? species.id;
  const pokemon = await apiFetch(`/pokemon/${pokemonId}/`);
  if (!pokemon) return null;
  return { species, pokemon };
});

export async function generateMetadata({ params }) {
  const { name } = await params;
  const data = await loadPokemon(name);
  return { title: data ? englishName(data.species) : 'Not found' };
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

async function buildMovesData(pokemon) {
  const [versionGroups, typeLabels] = await Promise.all([getVersionGroups(), getTypeLabels()]);
  const moveRecords = await fetchMany(pokemon.moves.map((m) => `/move/${m.move.name}/`));
  const moveByName = new Map(moveRecords.filter(Boolean).map((m) => [m.name, m]));

  const usedGroups = new Set();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details ?? []) usedGroups.add(detail.version_group.name);
  }
  const games = versionGroups.filter((vg) => usedGroups.has(vg.name));

  const tablesByGame = {};
  for (const game of games) {
    const byMethod = new Map();
    for (const move of pokemon.moves) {
      const record = moveByName.get(move.move.name);
      if (!record) continue;
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group.name !== game.name) continue;
        const method = detail.move_learn_method.name;
        if (!byMethod.has(method)) byMethod.set(method, []);
        byMethod.get(method).push({
          level: detail.level_learned_at,
          move: record.name,
          moveLabel: englishName(record),
          type: record.type?.name ?? '',
          typeLabel: typeLabels[record.type?.name] ?? humanize(record.type?.name ?? ''),
          category: humanize(record.damage_class?.name ?? ''),
          power: record.power,
          accuracy: record.accuracy,
          pp: record.pp,
        });
      }
    }
    const methods = [...byMethod.keys()].sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return humanize(a).localeCompare(humanize(b));
    });
    tablesByGame[game.name] = methods.map((method) => {
      const seen = new Set();
      const rows = byMethod
        .get(method)
        .filter((row) => {
          const key = `${row.level}|${row.move}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort(
          method === 'level-up'
            ? (a, b) => a.level - b.level || a.moveLabel.localeCompare(b.moveLabel)
            : (a, b) => a.moveLabel.localeCompare(b.moveLabel),
        );
      return { method, methodLabel: humanize(method), rows };
    });
  }
  return {
    games: games.map((g) => ({ name: g.name, label: g.label })),
    tablesByGame,
  };
}

export default async function PokemonPage({ params, searchParams }) {
  const { name } = await params;
  const sp = (await searchParams) ?? {};
  const data = await loadPokemon(name);
  if (!data) return <NotFound />;

  const { species, pokemon } = data;
  const displayName = englishName(species);
  const genus = englishGenus(species);
  const flavor = latestEnglishFlavor(species);
  const typeLabels = await getTypeLabels();
  const types = (pokemon.types ?? []).slice().sort((a, b) => a.slot - b.slot);
  const stats = (pokemon.stats ?? []).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  const STAT_MAX = 255;
  const abilities = (pokemon.abilities ?? []).slice().sort((a, b) => a.slot - b.slot);
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default ?? null;

  const chainId = idFromUrl(species.evolution_chain?.url);
  const chain = chainId != null ? await apiFetch(`/evolution-chain/${chainId}/`) : null;

  const movesData = await buildMovesData(pokemon);
  const defaultGame = movesData.games[movesData.games.length - 1]?.name ?? '';
  const requestedGame = typeof sp.game === 'string' ? sp.game : '';
  const initialGame = movesData.games.some((g) => g.name === requestedGame) ? requestedGame : defaultGame;

  return (
    <>
      <div className="summary">
        <div className="summary-artwork">
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork} alt={displayName} width="288" height="288" />
          ) : (
            <span className="card-sprite-empty" aria-hidden="true" />
          )}
        </div>
        <div className="summary-info">
          <p className="dex">{dexNumber(species.id)}</p>
          <h1>{displayName}</h1>
          {genus && <p className="genus">{genus}</p>}
          <div className="summary-types">
            {types.map((t) => (
              <Link key={t.type.name} href={`/types/${t.type.name}`} className={`type-badge type-${t.type.name}`}>
                {typeLabels[t.type.name] ?? humanize(t.type.name)}
              </Link>
            ))}
          </div>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {flavor && <p className="flavor-text">{flavor}</p>}
        </div>
      </div>

      <Section labelledBy="stats-heading" title="Base stats">
        <table className="stats-table">
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td className="stat-value">{stat.value}</td>
                <td>
                  <div className="stat-track">
                    <div className="stat-bar" style={{ width: `${Math.min(100, (stat.value / STAT_MAX) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td>
                <div className="stat-track">
                  <div className="stat-bar" style={{ width: `${Math.min(100, (total / Math.max(1, stats.length) / STAT_MAX) * 100)}%` }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section labelledBy="abilities-heading" title="Abilities">
        <ul className="section-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</Link>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="evolution-heading" title="Evolution">
        {chain?.chain ? (
          <ul className="section-list evolution-list">
            <EvolutionNode node={chain.chain} />
          </ul>
        ) : (
          <p>{MISSING}</p>
        )}
      </Section>

      <MovesSection
        games={movesData.games}
        tablesByGame={movesData.tablesByGame}
        defaultGame={defaultGame}
        initialGame={initialGame}
      />
    </>
  );
}
