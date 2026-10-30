import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import TypeBadge from "~/components/TypeBadge";
import { getTypePageData, type TypePageData } from "~/lib/queries";

function TypeView(props: { data: TypePageData }) {
  return (
    <>
      <Title>{props.data.englishName} – Pokédex</Title>
      <h1>{props.data.englishName}</h1>

      <section class="section" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations-list">
          <For each={props.data.relations}>
            {(relation) => (
              <div class="relation">
                <dt>{relation.label}</dt>
                <dd>
                  <Show when={relation.types.length > 0} fallback="None">
                    <For each={relation.types}>
                      {(type) => (
                        <TypeBadge name={type.name} label={type.label} link />
                      )}
                    </For>
                  </Show>
                </dd>
              </div>
            )}
          </For>
        </dl>
      </section>

      <section class="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count-line">{props.data.pokemon.length} Pokémon</p>
        <ul class="pokemon-grid">
          <For each={props.data.pokemon}>
            {(pokemon) => <PokemonCard species={pokemon} />}
          </For>
        </ul>
      </section>

      <section class="section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count-line">{props.data.moves.length} moves</p>
        <ul class="move-links">
          <For each={props.data.moves}>
            {(move) => (
              <li>
                <A href={`/moves/${move.name}`}>{move.label}</A>
              </li>
            )}
          </For>
        </ul>
      </section>
    </>
  );
}

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => getTypePageData(params.name ?? ""));

  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()} keyed>
        {(type) => <TypeView data={type} />}
      </Show>
    </>
  );
}
