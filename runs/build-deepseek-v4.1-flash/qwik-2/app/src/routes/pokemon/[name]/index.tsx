import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$ } from "@builder.io/qwik-city";
import { MoveTable } from "../../../components/MoveTable";
import { NotFound } from "../../../components/NotFound";
import { TypeBadge } from "../../../components/TypeBadge";
import { loadPokemonPage } from "../../../lib/api.server";
import { dexNumber, humanize } from "../../../lib/format";

export const usePokemonLoader = routeLoader$(async ({ params, url, status }) => {
  const data = await loadPokemonPage(
    params.name,
    url.searchParams.get("game") || "",
  );
  if (!data) status(404);
  return data;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonLoader);
  return {
    title: data ? `${data.title} – Pokédex` : "Not found – Pokédex",
  };
};

interface EvolutionNode {
  name: string;
  children: EvolutionNode[];
}

function evolutionListItem(node: EvolutionNode) {
  return (
    <li>
      <Link href={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
      {node.children.length ? (
        <ul>
          {node.children.map((child) => evolutionListItem(child))}
        </ul>
      ) : null}
    </li>
  );
}



export default component$(() => {
  const data = usePokemonLoader();

  if (!data.value) {
    return <NotFound />;
  }

  const pokemon = data.value;

  return (
    <>
      <div className="pokemon-summary">
        <figure className="artwork">
          {pokemon.artwork ? (
            <img src={pokemon.artwork} alt={pokemon.title} />
          ) : null}
        </figure>
        <div className="summary-info">
          <p className="summary-dex">{dexNumber(pokemon.speciesId)}</p>
          <h1>{pokemon.title}</h1>
          <p className="genus">{pokemon.genus}</p>
          <div className="summary-types">
            {pokemon.types.map((type) => (
              <TypeBadge
                key={type.name}
                name={type.name}
                label={type.english}
                link
              />
            ))}
          </div>
          <dl className="inline-dl">
            <div className="inline-dl-item">
              <dt>Height</dt>
              <dd>{pokemon.height}</dd>
            </div>
            <div className="inline-dl-item">
              <dt>Weight</dt>
              <dd>{pokemon.weight}</dd>
            </div>
          </dl>
          <p className="flavor-text">{pokemon.flavor}</p>
        </div>
      </div>

      <section className="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {pokemon.stats.map((stat) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td>{stat.value}</td>
                <td>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${Math.min(100, (stat.value / 180) * 100)}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td>{pokemon.statTotal}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul>
          {pokemon.abilities.map((ability) => (
            <li key={ability.name}>
              <Link href={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? <span>{" (hidden)"}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {pokemon.evolution ? (
          <ul className="evolution-tree">
            {evolutionListItem(pokemon.evolution)}
          </ul>
        ) : null}
      </section>

      <section
        className="panel"
        id="moves"
        aria-labelledby="moves-heading"
      >
        <h2 id="moves-heading">Moves</h2>
        {pokemon.games.length ? (
          <div className="game-control">
            <label for="game-select">Game</label>
            <select id="game-select">
              {pokemon.games.map((game) => (
                <option
                  key={game.name}
                  value={game.name}
                  selected={game.name === pokemon.game}
                >
                  {game.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {pokemon.moveGroups.map((group) => (
          <MoveTable
            key={group.method}
            label={group.label}
            showLevel={group.showLevel}
            rows={group.rows}
          />
        ))}
      </section>

    </>
  );
});
