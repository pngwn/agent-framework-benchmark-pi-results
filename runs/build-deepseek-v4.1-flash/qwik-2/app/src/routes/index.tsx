import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useNavigate } from "@builder.io/qwik-city";
import { PokemonCard } from "../components/PokemonCard";
import { loadHomePage } from "../lib/api.server";

export const useHomeLoader = routeLoader$(({ url }) => loadHomePage(url));

export const head: DocumentHead = {
  title: "Pokédex",
};

function homeHref(options: {
  q?: string;
  type?: string;
  generation?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  const q = (options.q || "").trim();
  if (q) params.set("q", q);
  if (options.type) params.set("type", options.type);
  if (options.generation) params.set("generation", options.generation);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default component$(() => {
  const data = useHomeLoader();
  const nav = useNavigate();
  const search = useSignal(data.value.q);

  useTask$(({ track }) => {
    const q = track(() => data.value.q);
    search.value = q;
  });

  useTask$(({ track, cleanup }) => {
    const value = track(() => search.value);
    const currentQ = track(() => data.value.q);
    const type = track(() => data.value.type);
    const generation = track(() => data.value.generation);
    if (value.trim() === currentQ) return;

    const timer = setTimeout(() => {
      nav(
        homeHref({
          q: value,
          type,
          generation,
          page: 1,
        }),
        { replaceState: true, scroll: false },
      );
    }, 250);
    cleanup(() => clearTimeout(timer));
  });

  return (
    <>
      <h1>Pokémon</h1>

      <div className="filters">
        <div className="field">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            value={search.value}
            onInput$={(event) => {
              search.value = (event.target as HTMLInputElement).value;
            }}
          />
        </div>
        <div className="field">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            onChange$={(event) =>
              nav(
                homeHref({
                  q: search.value,
                  type: (event.target as HTMLSelectElement).value,
                  generation: data.value.generation,
                  page: 1,
                }),
                { scroll: false },
              )
            }
          >
            <option value="" selected={!data.value.type}>
              All types
            </option>
            {data.value.types.map((type) => (
              <option
                key={type.name}
                value={type.name}
                selected={data.value.type === type.name}
              >
                {type.english}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            onChange$={(event) =>
              nav(
                homeHref({
                  q: search.value,
                  type: data.value.type,
                  generation: (event.target as HTMLSelectElement).value,
                  page: 1,
                }),
                { scroll: false },
              )
            }
          >
            <option value="" selected={!data.value.generation}>
              All generations
            </option>
            {data.value.generations.map((generation) => (
              <option
                key={generation.name}
                value={generation.name}
                selected={data.value.generation === generation.name}
              >
                {generation.english}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{data.value.count} Pokémon</p>

      {data.value.count === 0 ? (
        <p className="empty-message">No Pokémon found</p>
      ) : (
        <ul className="pokemon-grid">
          {data.value.species.map((pokemon) => (
            <PokemonCard
              key={pokemon.id}
              pokemon={{
                id: pokemon.id,
                name: pokemon.name,
                sprite: pokemon.sprite,
                types: pokemon.types,
              }}
            />
          ))}
        </ul>
      )}

      <div className="pagination">
        {data.value.page > 1 ? (
          <Link
            href={homeHref({
              q: data.value.q,
              type: data.value.type,
              generation: data.value.generation,
              page: data.value.page - 1,
            })}
            rel="prev"
          >
            Previous page
          </Link>
        ) : null}
        <span>
          Page {data.value.page} of {data.value.totalPages}
        </span>
        {data.value.page < data.value.totalPages ? (
          <Link
            href={homeHref({
              q: data.value.q,
              type: data.value.type,
              generation: data.value.generation,
              page: data.value.page + 1,
            })}
            rel="next"
          >
            Next page
          </Link>
        ) : null}
      </div>
    </>
  );
});
