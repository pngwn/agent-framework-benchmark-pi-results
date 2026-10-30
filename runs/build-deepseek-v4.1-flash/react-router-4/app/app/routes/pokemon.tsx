import { data, Link } from "react-router";
import { EvolutionTree, type EvolutionNode } from "~/components/EvolutionTree";
import { MovesSection, orderMoveTables, type MoveRow } from "~/components/MovesSection";
import { NotFoundPage } from "~/components/NotFoundPage";
import { TypeBadge } from "~/components/TypeBadge";
import { fetchApi } from "~/lib/api.server";
import {
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavor,
} from "~/lib/format";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export async function loader({ params, request }: { params: { name: string }; request: Request }) {
  let species: any;
  try {
    species = await fetchApi(`/api/v2/pokemon-species/${encodeURIComponent(params.name)}`);
  } catch (error: any) {
    if (error?.status === 404) return data({ notFound: true as const }, { status: 404 });
    throw error;
  }

  const defaultVariety =
    species.varieties?.find((variety: any) => variety.is_default) ?? species.varieties?.[0];
  const pokemon = await fetchApi(defaultVariety.pokemon.url);
  const evolution = await fetchApi(species.evolution_chain.url);

  const gameRefs = new Map<string, { name: string; url: string }>();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      gameRefs.set(detail.version_group.name, detail.version_group);
    }
  }
  const gameDetails = await Promise.all([...gameRefs.values()].map((ref) => fetchApi(ref.url)));
  gameDetails.sort((a: any, b: any) => a.order - b.order);
  const games = gameDetails.map((game: any) => ({
    name: game.name,
    label: humanize(game.name),
    order: game.order,
  }));
  const latestGame = games.length ? games[games.length - 1].name : "";

  const requestedGame = new URL(request.url).searchParams.get("game") ?? "";
  const selectedGame = games.some((game) => game.name === requestedGame)
    ? requestedGame
    : latestGame;

  const rows: MoveRow[] = [];
  const moveRefs = new Map<string, { name: string; url: string }>();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selectedGame) continue;
      moveRefs.set(move.move.name, move.move);
      rows.push({
        id: 0,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at,
        moveName: move.move.name,
        moveLabel: "",
        typeName: "",
        typeLabel: "",
        category: "",
        power: null,
        accuracy: null,
        pp: null,
      });
    }
  }

  const moveData = new Map<string, any>();
  await Promise.all(
    [...moveRefs.values()].map(async (ref) => {
      moveData.set(ref.name, await fetchApi(ref.url));
    }),
  );

  const enrichedRows = rows.map((row) => {
    const move = moveData.get(row.moveName);
    if (!move) return row;
    return {
      ...row,
      id: move.id,
      moveLabel: englishName(move.names) ?? humanize(move.name),
      typeName: move.type.name,
      typeLabel: humanize(move.type.name),
      category: humanize(move.damage_class.name),
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
  });

  const englishSpeciesName = englishName(species.names) ?? humanize(species.name);
  const genus = species.genera?.find((entry: any) => entry.language.name === "en")?.genus ?? "";
  const artwork =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  const stats: Array<{ name: string; label: string; value: number }> = (pokemon.stats ?? []).map(
    (entry: any) => ({
      name: entry.stat.name,
      label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
      value: entry.base_stat,
    }),
  );
  const total = stats.reduce((sum: number, stat: { value: number }) => sum + stat.value, 0);

  return {
    notFound: false as const,
    speciesName: species.name,
    englishName: englishSpeciesName,
    dexNumber: dexNumber(species.id),
    genus,
    artwork,
    flavorText: latestEnglishFlavor(species.flavor_text_entries),
    types: [...(pokemon.types ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((entry: any) => ({ name: entry.type.name, label: humanize(entry.type.name) })),
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    stats,
    total,
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((entry: any) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: entry.is_hidden,
      })),
    evolution: toEvolutionNode(evolution.chain),
    games,
    selectedGame,
    latestGame,
    tables: orderMoveTables(enrichedRows),
    maxStat: Math.max(255, ...stats.map((stat) => stat.value)),
  };
}

function toEvolutionNode(node: any): EvolutionNode {
  return {
    name: node.species.name,
    children: (node.evolves_to ?? []).map(toEvolutionNode),
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  if (!loaderData || loaderData.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.englishName} – Pokédex` }];
}

export default function PokemonPage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFoundPage />;

  return (
    <>
      <div className="pokemon-summary">
        {loaderData.artwork ? (
          <div className="summary-artwork">
            <img src={loaderData.artwork} alt={loaderData.englishName} />
          </div>
        ) : null}
        <div className="summary-details">
          <div className="dex-number">{loaderData.dexNumber}</div>
          <h1>{loaderData.englishName}</h1>
          <p className="genus">{loaderData.genus}</p>
          <div className="type-row">
            {loaderData.types.map((type: any) => (
              <TypeBadge key={type.name} name={type.name} label={type.label} link />
            ))}
          </div>
          <dl className="measures">
            <div>
              <dt>Height</dt>
              <dd>{loaderData.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{loaderData.weight} kg</dd>
            </div>
          </dl>
          {loaderData.flavorText ? <p className="flavor-text">{loaderData.flavorText}</p> : null}
        </div>
      </div>

      <section className="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {loaderData.stats.map((stat: any) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td className="stat-value">{stat.value}</td>
                <td>
                  <div className="stat-track">
                    <div
                      className="stat-fill"
                      style={{ width: `${Math.min(100, (stat.value / loaderData.maxStat) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{loaderData.total}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="link-list">
          {loaderData.abilities.map((ability: any) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <EvolutionTree node={loaderData.evolution} />
      </section>

      <MovesSection
        games={loaderData.games}
        selectedGame={loaderData.selectedGame}
        tables={loaderData.tables}
      />
    </>
  );
}
