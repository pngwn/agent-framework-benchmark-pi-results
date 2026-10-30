import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$ } from "@builder.io/qwik-city";
import { NotFound } from "../../../components/NotFound";
import { PokemonCard } from "../../../components/PokemonCard";
import { TypeBadge } from "../../../components/TypeBadge";
import { loadTypePage } from "../../../lib/api.server";

export const useTypeLoader = routeLoader$(async ({ params, status }) => {
  const data = await loadTypePage(params.name);
  if (!data) status(404);
  return data;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypeLoader);
  return {
    title: data ? `${data.title} – Pokédex` : "Not found – Pokédex",
  };
};

export default component$(() => {
  const data = useTypeLoader();

  if (!data.value) {
    return <NotFound />;
  }

  const type = data.value;

  return (
    <>
      <h1>{type.title}</h1>

      <section className="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl className="relation-list">
          {type.relations.map((relation) => (
            <div className="relation-item" key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length ? (
                  relation.types.map((related) => (
                    <TypeBadge
                      key={related.name}
                      name={related.name}
                      label={related.english}
                      link
                    />
                  ))
                ) : (
                  <span>None</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="section-count">{type.cards.length} Pokémon</p>
        <ul className="pokemon-grid">
          {type.cards.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p className="section-count">{type.moves.length} moves</p>
        <ul className="link-grid">
          {type.moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
});
