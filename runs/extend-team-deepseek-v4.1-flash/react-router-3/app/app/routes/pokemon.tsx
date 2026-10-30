import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/pokemon";
import { api, apiOr404, getIndex, typeInfo } from "../lib/api.server";
import { readTeam } from "../lib/team.server";
import { MAX_TEAM_SIZE } from "../lib/team";
import {
  dexNumber,
  englishName,
  humanize,
  latestFlavorText,
  pageTitle,
  type NamedResource,
  type Translated,
} from "../lib/format";
import { Section } from "../components/Section";
import { TypeBadges } from "../components/TypeBadge";
import { MoveTable, type MoveRow } from "../components/MoveTable";
import { TeamToggle } from "../components/TeamControls";

type Species = {
  id: number;
  name: string;
  names: Translated[];
  genera: { genus: string; language: NamedResource }[];
  flavor_text_entries: { flavor_text: string; language: NamedResource }[];
  evolution_chain: { url: string } | null;
};

type Pokemon = {
  id: number;
  height: number;
  weight: number;
  types: { slot: number; type: NamedResource }[];
  abilities: { slot: number; is_hidden: boolean; ability: NamedResource }[];
  stats: { base_stat: number; stat: NamedResource }[];
  sprites: { other?: { "official-artwork"?: { front_default: string | null } } };
  moves: {
    move: NamedResource;
    version_group_details: { level_learned_at: number; version_group: NamedResource; move_learn_method: NamedResource }[];
  }[];
};

type ChainLink = { species: NamedResource; evolves_to: ChainLink[] };

type Move = {
  name: string;
  names: Translated[];
  type: NamedResource;
  damage_class: NamedResource | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type VersionGroup = { name: string; order: number };

export type EvolutionNode = { name: string; label: string; evolvesTo: EvolutionNode[] };

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function methodRank(method: string): [number, string] {
  const i = METHOD_ORDER.indexOf(method);
  return [i === -1 ? METHOD_ORDER.length : i, humanize(method)];
}

function toEvolutionNode(link: ChainLink): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    evolvesTo: link.evolves_to.map(toEvolutionNode),
  };
}

async function versionGroupOrders(): Promise<Map<string, number>> {
  const list = await apiOr404<{ results: NamedResource[] }>("version-group/?limit=1000");
  const groups = await Promise.all(list.results.map((g) => apiOr404<VersionGroup>(g.url)));
  return new Map(groups.map((g) => [g.name, g.order]));
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const species = await apiOr404<Species>(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
  const team = readTeam(request);
  const [pokemon, chain, index, orders] = await Promise.all([
    apiOr404<Pokemon>(`pokemon/${species.id}`),
    species.evolution_chain ? api<{ chain: ChainLink }>(species.evolution_chain.url) : null,
    getIndex(),
    versionGroupOrders(),
  ]);

  // Version groups in which this Pokémon learns moves, by the game's order.
  const groupNames = new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)));
  const games = [...groupNames]
    .sort((a, b) => (orders.get(a) ?? 0) - (orders.get(b) ?? 0))
    .map((name) => ({ name, label: humanize(name) }));
  const requestedGame = new URL(request.url).searchParams.get("game");
  const game = games.find((g) => g.name === requestedGame)?.name ?? games[games.length - 1]?.name ?? null;

  // Moves learned in the selected game, grouped by learn method.
  const learned = pokemon.moves.flatMap((m) =>
    m.version_group_details
      .filter((d) => d.version_group.name === game)
      .map((d) => ({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at })),
  );
  const moveDetails = new Map(
    await Promise.all(
      [...new Set(learned.map((l) => l.move.url))].map(async (url) => [url, await api<Move>(url)] as const),
    ),
  );
  const byMethod = new Map<string, MoveRow[]>();
  for (const { move, method, level } of learned) {
    const detail = moveDetails.get(move.url);
    if (!byMethod.has(method)) byMethod.set(method, []);
    byMethod.get(method)!.push({
      name: move.name,
      label: englishName(detail?.names, move.name),
      level: method === "level-up" ? level : null,
      type: detail ? typeInfo(index, detail.type.name) : null,
      category: detail?.damage_class ? humanize(detail.damage_class.name) : null,
      power: detail?.power ?? null,
      accuracy: detail?.accuracy ?? null,
      pp: detail?.pp ?? null,
    });
  }
  const moveTables = [...byMethod]
    .sort(([a], [b]) => {
      const [ra, la] = methodRank(a);
      const [rb, lb] = methodRank(b);
      return ra - rb || la.localeCompare(lb);
    })
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort(
        (a, b) => (method === "level-up" ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label),
      ),
    }));

  const stats = pokemon.stats.map((s) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  return {
    id: species.id,
    name: species.name,
    label: englishName(species.names, species.name),
    genus: species.genera.find((g) => g.language.name === "en")?.genus ?? null,
    flavorText: latestFlavorText(species.flavor_text_entries),
    artwork: pokemon.sprites.other?.["official-artwork"]?.front_default ?? null,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeInfo(index, t.type.name)),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    stats,
    evolution: chain
      ? toEvolutionNode(chain.chain)
      : { name: species.name, label: humanize(species.name), evolvesTo: [] },
    games,
    game,
    moveTables,
    inTeam: team.includes(species.name),
    teamFull: team.length >= MAX_TEAM_SIZE,
  };
}

function EvolutionList({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to={`/pokemon/${node.name}`}>{node.label}</Link>
          {node.evolvesTo.length > 0 && <EvolutionList nodes={node.evolvesTo} />}
        </li>
      ))}
    </ul>
  );
}

const STAT_MAX = 255;

function StatBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="stat-bar" aria-hidden="true">
      <span className="stat-bar__fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}

export default function PokemonPage({ loaderData }: Route.ComponentProps) {
  const d = loaderData;
  const total = d.stats.reduce((sum, s) => sum + s.value, 0);
  const navigate = useNavigate();
  const location = useLocation();
  const gameRef = useRef<HTMLSelectElement>(null);

  const selectGame = (game: string) =>
    navigate({ search: `?game=${encodeURIComponent(game)}`, hash: location.hash }, { preventScrollReset: true });

  useEffect(() => {
    // A game picked before hydration finished didn't reach React; apply it now.
    if (gameRef.current && d.game && gameRef.current.value !== d.game) selectGame(gameRef.current.value);
  }, []);

  useEffect(() => {
    if (gameRef.current && d.game) gameRef.current.value = d.game;
  }, [d.game]);

  return (
    <>
      <title>{pageTitle(d.label)}</title>
      <div className="hero">
        <div className="hero__art">
          {d.artwork && <img src={d.artwork} alt={d.label} width={475} height={475} />}
        </div>
        <div className="hero__info">
          <p className="hero__dex">{dexNumber(d.id)}</p>
          <h1>{d.label}</h1>
          {d.genus && <p className="hero__genus">{d.genus}</p>}
          <TypeBadges types={d.types} link />
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{d.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d.weight} kg</dd>
            </div>
          </dl>
          <TeamToggle species={d.name} inTeam={d.inTeam} full={d.teamFull} />
          {d.flavorText && <p className="hero__flavor">{d.flavorText}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td className="stats__value">{s.value}</td>
                <td className="stats__bar">
                  <StatBar value={s.value} max={STAT_MAX} />
                </td>
              </tr>
            ))}
            <tr className="stats__total">
              <th scope="row">Total</th>
              <td className="stats__value">{total}</td>
              <td className="stats__bar">
                <StatBar value={total} max={STAT_MAX * Math.max(1, d.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{a.label}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution" className="evolution">
        <EvolutionList nodes={[d.evolution]} />
      </Section>

      <Section title="Moves" id="moves">
        {d.games.length === 0 ? (
          <p>—</p>
        ) : (
          <>
            <div className="game-picker">
              <label htmlFor="game">Game</label>
              <select
                ref={gameRef}
                id="game"
                name="game"
                defaultValue={d.game ?? undefined}
                onChange={(e) => selectGame(e.currentTarget.value)}
              >
                {d.games.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {d.moveTables.map((t) => (
              <MoveTable key={`${d.game}-${t.method}`} caption={t.label} rows={t.rows} showLevel={t.method === "level-up"} />
            ))}
          </>
        )}
      </Section>
    </>
  );
}
