import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";
import { NotFound } from "../../../components/NotFound";
import { PokemonCard } from "../../../components/PokemonCard";
import { TypeBadge } from "../../../components/TypeBadge";
import { loadMovePage } from "../../../lib/api.server";

export const useMoveLoader = routeLoader$(async ({ params, status }) => {
  const data = await loadMovePage(params.name);
  if (!data) status(404);
  return data;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMoveLoader);
  return {
    title: data ? `${data.title} – Pokédex` : "Not found – Pokédex",
  };
};

export default component$(() => {
  const data = useMoveLoader();

  if (!data.value) {
    return <NotFound />;
  }

  const move = data.value;

  return (
    <>
      <h1>{move.title}</h1>

      <dl className="inline-dl">
        <div className="inline-dl-item">
          <dt>Type</dt>
          <dd>
            <TypeBadge
              name={move.typeName}
              label={move.typeLabel}
              link
            />
          </dd>
        </div>
        <div className="inline-dl-item">
          <dt>Category</dt>
          <dd>{move.category}</dd>
        </div>
        <div className="inline-dl-item">
          <dt>Power</dt>
          <dd>{move.power}</dd>
        </div>
        <div className="inline-dl-item">
          <dt>Accuracy</dt>
          <dd>{move.accuracy}</dd>
        </div>
        <div className="inline-dl-item">
          <dt>PP</dt>
          <dd>{move.pp}</dd>
        </div>
      </dl>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p className="effect-text">{move.effect}</p>
      </section>

      <section className="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="section-count">{move.cards.length} Pokémon</p>
        <ul className="pokemon-grid">
          {move.cards.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </ul>
      </section>
    </>
  );
});
