import { data, Link, useNavigate } from "react-router";
import { getJSON, getRecordOrNull, getSpeciesIndex } from "../lib/api.server";
import { dexNumber, EM_DASH, englishName, humanize, latestEnglishFlavor } from "../lib/format";
import { Section } from "../components/Section";
import { MoveTable, type MoveRow } from "../components/MoveTable";
import { NotFound } from "../components/NotFound";
import { TypeBadgeLink } from "../components/TypeBadge";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

interface EvoNode {
  name: string;
  label: string;
  evolvesTo: EvoNode[];
}

function convertEvoNode(node: any): EvoNode {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    evolvesTo: (node.evolves_to ?? []).map(convertEvoNode),
  };
}

export async function loader({ params, request }: { params: { name?: string }; request: Request }) {
  const name = params.name ?? "";
  const species = await getRecordOrNull("pokemon-species", name);
  if (!species) return data({ notFound: true as const }, { status: 404 });

  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const pokemon = variety ? await getJSON(variety.pokemon.url) : null;

  const chainUrl = species.evolution_chain?.url;
  const [chain] = await Promise.all([chainUrl ? getJSON(chainUrl) : Promise.resolve(null), getSpeciesIndex()]);

  // Version groups in which this Pokémon learns moves, ordered by their `order`.
  const vgNames = [
    ...new Set(
      (pokemon?.moves ?? []).flatMap((m: any) =>
        (m.version_group_details ?? []).map((d: any) => d.version_group.name as string),
      ),
    ),
  ];
  const versionGroups = (
    await Promise.all(vgNames.map((n) => getJSON(`/version-group/${encodeURIComponent(n)}/`)))
  ).sort((a, b) => a.order - b.order);

  const url = new URL(request.url);
  const gameParam = url.searchParams.get("game");
  const selected =
    versionGroups.find((v) => v.name === gameParam) ?? versionGroups[versionGroups.length - 1] ?? null;

  // Moves for the selected version group, grouped by learn method.
  let methods: Array<{ name: string; label: string; hasLevel: boolean; rows: MoveRow[] }> = [];
  if (selected && pokemon) {
    const entries: Array<{ move: string; method: string; level: number }> = [];
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details ?? []) {
        if (d.version_group.name === selected.name) {
          entries.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at });
        }
      }
    }
    const moveNames = [...new Set(entries.map((e) => e.move))];
    const moveRecords = new Map<string, any>();
    await Promise.all(
      moveNames.map(async (n) => {
        moveRecords.set(n, await getJSON(`/move/${encodeURIComponent(n)}/`));
      }),
    );
    const byMethod = new Map<string, MoveRow[]>();
    for (const entry of entries) {
      const rec = moveRecords.get(entry.move);
      const row: MoveRow = {
        level: entry.level,
        move: entry.move,
        moveLabel: englishName(rec),
        type: rec?.type?.name ?? null,
        typeLabel: rec?.type?.name ? humanize(rec.type.name) : EM_DASH,
        category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : EM_DASH,
        power: rec?.power ?? null,
        accuracy: rec?.accuracy ?? null,
        pp: rec?.pp ?? null,
      };
      const rows = byMethod.get(entry.method) ?? [];
      rows.push(row);
      byMethod.set(entry.method, rows);
    }
    const methodRank = (name: string) => {
      const i = METHOD_ORDER.indexOf(name);
      return i === -1 ? METHOD_ORDER.length : i;
    };
    methods = [...byMethod.entries()]
      .map(([methodName, rows]) => {
        const hasLevel = methodName === "level-up";
        const sorted = [...rows].sort((a, b) =>
          hasLevel
            ? (a.level ?? 0) - (b.level ?? 0) || a.moveLabel.localeCompare(b.moveLabel)
            : a.moveLabel.localeCompare(b.moveLabel),
        );
        return { name: methodName, label: humanize(methodName), hasLevel, rows: sorted };
      })
      .sort(
        (a, b) => methodRank(a.name) - methodRank(b.name) || a.label.localeCompare(b.label),
      );
  }

  const stats = (pokemon?.stats ?? []).map((s: any) => ({ key: s.stat.name, value: s.base_stat }));

  return {
    notFound: false as const,
    title: englishName(species),
    dex: species.id,
    genus: species.genera?.find((g: any) => g.language?.name === "en")?.genus ?? "",
    types: (pokemon?.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, label: humanize(t.type.name) })),
    artwork:
      pokemon?.sprites?.other?.["official-artwork"]?.front_default ?? pokemon?.sprites?.front_default ?? null,
    height: pokemon?.height ?? null,
    weight: pokemon?.weight ?? null,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    stats,
    total: stats.reduce((sum: number, s: any) => sum + s.value, 0),
    abilities: (pokemon?.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: !!a.is_hidden })),
    evolution: chain?.chain ? convertEvoNode(chain.chain) : null,
    games: versionGroups.map((v) => ({ name: v.name, label: humanize(v.name) })),
    selectedGame: selected?.name ?? null,
    methods,
  };
}

function EvolutionNode({ node }: { node: EvoNode }) {
  return (
    <li>
      <Link to={`/pokemon/${node.name}`}>{node.label}</Link>
      {node.evolvesTo.length > 0 ? (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function GameSelect({ games, selectedGame }: { games: Array<{ name: string; label: string }>; selectedGame: string | null }) {
  const navigate = useNavigate();
  if (games.length === 0) return null;
  return (
    <div className="field game-field">
      <label htmlFor="game">Game</label>
      <select
        id="game"
        value={selectedGame ?? ""}
        onChange={(e) => navigate(`?game=${encodeURIComponent(e.target.value)}#moves`)}
      >
        {games.map((g) => (
          <option key={g.name} value={g.name}>
            {g.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PokemonPage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFound />;
  const d = loaderData;
  return (
    <>
      <title>{`${d.title} – Pokédex`}</title>
      <div className="summary">
        <div className="summary-art">
          {d.artwork ? <img src={d.artwork} alt={d.title} width={288} height={288} /> : null}
        </div>
        <div className="summary-info">
          <p className="dex">{dexNumber(d.dex)}</p>
          <h1>{d.title}</h1>
          {d.genus ? <p className="genus">{d.genus}</p> : null}
          <p className="type-links">
            {d.types.map((t: any) => (
              <TypeBadgeLink key={t.name} name={t.name} label={t.label} />
            ))}
          </p>
          <dl className="summary-dl">
            <div>
              <dt>Height</dt>
              <dd>{d.height !== null ? `${(d.height / 10).toFixed(1)} m` : EM_DASH}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d.weight !== null ? `${(d.weight / 10).toFixed(1)} kg` : EM_DASH}</dd>
            </div>
          </dl>
        </div>
      </div>
      {d.flavor ? <p className="flavor">{d.flavor}</p> : null}

      <Section title="Base stats">
        <table className="stats-table">
          <tbody>
            {d.stats.map((s: any) => (
              <tr key={s.key}>
                <th scope="row">{STAT_LABELS[s.key] ?? humanize(s.key)}</th>
                <td className="num stat-value">{s.value}</td>
                <td className="stat-bar">
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="num stat-value">{d.total}</td>
              <td className="stat-bar">
                <div className="stat-track">
                  <div className="stat-fill" style={{ width: `${Math.min(100, (d.total / 1530) * 100)}%` }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {d.abilities.map((a: any) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{a.label}</Link>
              {a.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        {d.evolution ? (
          <ul className="evolution-tree">
            <EvolutionNode node={d.evolution} />
          </ul>
        ) : null}
      </Section>

      <Section title="Moves" id="moves">
        <GameSelect games={d.games} selectedGame={d.selectedGame} />
        {d.methods.map((m: any) => (
          <MoveTable key={m.name} label={m.label} hasLevel={m.hasLevel} rows={m.rows} />
        ))}
      </Section>
    </>
  );
}
