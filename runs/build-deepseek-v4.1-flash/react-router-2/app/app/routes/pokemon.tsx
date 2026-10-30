import { useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import { MovesTables } from "../components/MovesTables";
import { NotFoundPage } from "../components/NotFoundPage";
import { Section } from "../components/Section";
import { TypeBadge } from "../components/TypeBadge";
import { getPokemonData } from "../lib/api.server";
import { dexNumber, displayMissing } from "../lib/format";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const gameParam = new URL(request.url).searchParams.get("game");
  return getPokemonData(params.name ?? "", gameParam);
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData && "notFound" in loaderData ? "Not found – Pokédex" : `${loaderData?.name ?? "Not found"} – Pokédex` },
];

type EvolutionNode = {
  name: string;
  display: string;
  children: EvolutionNode[];
};

function EvolutionItem({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to={`/pokemon/${node.name}`}>{node.display}</Link>
      {node.children.length ? (
        <ul>
          {node.children.map((child) => (
            <EvolutionItem key={`${child.name}-${child.display}`} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function PokemonRoute() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash !== "#moves") return;
    const timer = window.setTimeout(() => {
      document.getElementById("moves")?.scrollIntoView();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if ("notFound" in data) return <NotFoundPage />;

  function changeGame(game: string) {
    const params = new URLSearchParams(location.search);
    if (game) params.set("game", game);
    else params.delete("game");
    const value = params.toString();
    navigate(
      { search: value ? `?${value}` : "", hash: location.hash || undefined },
      { preventScrollReset: true },
    );
  }

  return (
    <div className="pokemon-page">
      <div className="pokemon-summary">
        <div className="artwork-card">
          {data.artwork ? <img className="artwork" src={data.artwork} alt={data.name} /> : null}
        </div>
        <div className="pokemon-details">
          <p className="pokemon-dex">{dexNumber(data.id)}</p>
          <h1 className="pokemon-title">{data.name}</h1>
          {data.genus ? <p className="pokemon-genus">{data.genus}</p> : null}
          <div className="pokemon-types">
            {data.types.map((type: any) => (
              <TypeBadge key={type.name} name={type.name} label={type.english} to={`/types/${type.name}`} />
            ))}
          </div>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{data.measurements.height == null ? "—" : `${data.measurements.height} m`}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.measurements.weight == null ? "—" : `${data.measurements.weight} kg`}</dd>
            </div>
          </dl>
          <p className="flavor-text">{data.description}</p>
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat: any) => (
              <tr key={stat.name}>
                <th scope="row" className="stat-label">
                  {stat.label}
                </th>
                <td className="stat-value">{stat.value}</td>
                <td className="stat-bar-cell">
                  <div className="stat-track" aria-hidden="true">
                    <div
                      className="stat-fill"
                      style={{ width: `${Math.min(100, (stat.value / 180) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="stat-label">
                Total
              </th>
              <td className="stat-value">{data.total}</td>
              <td className="stat-bar-cell" />
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {data.abilities.map((ability: any) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{ability.display}</Link>
              {ability.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        {data.evolution ? (
          <ul className="evolution-list">
            <EvolutionItem node={data.evolution} />
          </ul>
        ) : null}
      </Section>

      <Section title="Moves" id="moves">
        <div className="moves-controls">
          <label htmlFor="game-select">Game</label>
          <select
            id="game-select"
            value={data.moves.selectedGame ?? ""}
            onChange={(event) => changeGame(event.target.value)}
          >
            {data.moves.games.map((game: any) => (
              <option key={game.name} value={game.name}>
                {game.display}
              </option>
            ))}
          </select>
        </div>
        <MovesTables key={data.moves.selectedGame ?? "none"} tables={data.moves.tables as any} />
      </Section>
    </div>
  );
}
