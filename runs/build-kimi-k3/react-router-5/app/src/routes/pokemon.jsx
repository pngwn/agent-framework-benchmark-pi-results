import { data, Link, useSearchParams } from 'react-router';
import {
  apiGet,
  getTypeData,
  getVersionGroupOrders,
  idFromUrl,
  slimChain,
} from '../lib/api.server.js';
import { dexNumber, englishName, humanize, latestEnFlavor } from '../lib/util.js';
import { Section } from '../lib/components.jsx';
import { MoveTables } from '../lib/moves.jsx';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export async function loader({ params, request }) {
  const species = await apiGet(`/pokemon-species/${encodeURIComponent(params.name)}`);
  if (!species) throw data('Not Found', { status: 404 });
  const variety =
    species.varieties.find((v) => v.is_default) ?? species.varieties[0] ?? null;
  const pokemon = variety ? await apiGet(`/pokemon/${idFromUrl(variety.pokemon.url)}`) : null;
  if (!pokemon) throw data('Not Found', { status: 404 });

  const chainId = species.evolution_chain?.url ? idFromUrl(species.evolution_chain.url) : null;
  const [chain, typeData, versionGroupOrders] = await Promise.all([
    chainId ? apiGet(`/evolution-chain/${chainId}`) : null,
    getTypeData(),
    getVersionGroupOrders(),
  ]);

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const gameSet = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) gameSet.add(detail.version_group.name);
  }
  const games = [...gameSet].sort(
    (a, b) => (versionGroupOrders.get(a) ?? 0) - (versionGroupOrders.get(b) ?? 0),
  );

  const requested = new URL(request.url).searchParams.get('game');
  const game = requested && games.includes(requested) ? requested : games[games.length - 1] ?? null;

  // Rows for the selected version group, grouped by learn method.
  const byMethod = new Map();
  if (game) {
    const seen = new Set();
    const moveNames = new Set();
    for (const move of pokemon.moves) {
      for (const detail of move.version_group_details) {
        if (detail.version_group.name !== game) continue;
        const key = `${detail.move_learn_method.name}|${move.move.name}|${detail.level_learned_at}`;
        if (seen.has(key)) continue;
        seen.add(key);
        moveNames.add(move.move.name);
        if (!byMethod.has(detail.move_learn_method.name)) {
          byMethod.set(detail.move_learn_method.name, []);
        }
        byMethod.get(detail.move_learn_method.name).push({
          method: detail.move_learn_method.name,
          level: detail.level_learned_at,
          move: move.move.name,
        });
      }
    }
    const moveRecords = await Promise.all([...moveNames].map((n) => apiGet(`/move/${n}`)));
    const moveInfo = new Map();
    for (const record of moveRecords) {
      if (!record) continue;
      moveInfo.set(record.name, {
        name: record.name,
        en: englishName(record.names, record.name),
        type: record.type.name,
        typeEn: getTypeEn(typeData, record.type.name),
        category: humanize(record.damage_class.name),
        power: record.power,
        accuracy: record.accuracy,
        pp: record.pp,
      });
    }
    for (const [method, rows] of byMethod) {
      byMethod.set(
        method,
        rows.flatMap((r) => {
          const info = moveInfo.get(r.move);
          return info ? [{ level: r.level, ...info }] : [];
        }),
      );
    }
  }

  const methods = [...byMethod.keys()]
    .sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return humanize(a).localeCompare(humanize(b));
    })
    .map((name) => {
      const rows = byMethod.get(name);
      rows.sort(
        name === 'level-up'
          ? (a, b) => a.level - b.level || a.en.localeCompare(b.en)
          : (a, b) => a.en.localeCompare(b.en),
      );
      return { name, label: humanize(name), rows };
    });

  const en = englishName(species.names, species.name);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  return {
    name: en,
    speciesName: species.name,
    dex: species.id,
    genus: species.genera.find((g) => g.language?.name === 'en')?.genus ?? '',
    flavor: latestEnFlavor(species.flavor_text_entries) ?? '',
    artwork,
    height: pokemon.height,
    weight: pokemon.weight,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, en: getTypeEn(typeData, t.type.name) })),
    stats: (pokemon.stats ?? []).map((s) => ({ name: s.stat.name, value: s.base_stat })),
    abilities: (pokemon.abilities ?? []).map((a) => ({
      name: a.ability.name,
      hidden: Boolean(a.is_hidden),
    })),
    chain: slimChain(chain?.chain),
    games,
    game,
    methods,
  };
}

function getTypeEn(typeData, name) {
  return typeData.byName.get(name)?.en ?? humanize(name);
}

export function meta({ loaderData }) {
  return [{ title: `${loaderData.name} – Pokédex` }];
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link to={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolvesTo.length ? (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionNode key={child.species.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function PokemonPage({ loaderData }) {
  const d = loaderData;
  const [params, setParams] = useSearchParams();
  const total = d.stats.reduce((n, s) => n + s.value, 0);

  return (
    <>
      <div className="panel hero">
        {d.artwork ? (
          <div className="hero-art">
            <img src={d.artwork} alt={d.name} width="288" height="288" />
          </div>
        ) : null}
        <div className="hero-info">
          <p className="dex">{dexNumber(d.dex)}</p>
          <h1>{d.name}</h1>
          <p className="genus">{d.genus}</p>
          <p className="hero-types">
            {d.types.map((t) => (
              <Link key={t.name} to={`/types/${t.name}`} className={`type-badge type-${t.name}`}>
                {t.en}
              </Link>
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{(d.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(d.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          <p className="flavor">{d.flavor}</p>
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{STAT_LABELS[s.name] ?? humanize(s.name)}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar">
                  <span style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td className="stat-bar">
                <span style={{ width: `${Math.min(100, (total / 720) * 100)}%` }} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{humanize(a.name)}</Link>
              {a.hidden ? ' (hidden)' : ''}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {d.chain ? (
          <ul className="evo-tree">
            <EvolutionNode node={d.chain} />
          </ul>
        ) : (
          <p>—</p>
        )}
      </Section>

      <Section id="moves" title="Moves">
        {d.games.length ? (
          <>
            <div className="field game-field">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={d.game}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  next.set('game', e.target.value);
                  setParams(next, { preventScrollReset: true });
                }}
              >
                {d.games.map((g) => (
                  <option key={g} value={g}>
                    {humanize(g)}
                  </option>
                ))}
              </select>
            </div>
            <MoveTables methods={d.methods} />
          </>
        ) : (
          <p>—</p>
        )}
      </Section>
    </>
  );
}
