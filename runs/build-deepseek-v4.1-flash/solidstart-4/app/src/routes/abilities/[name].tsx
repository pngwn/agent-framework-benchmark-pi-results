import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getAbilityPageData, type AbilityPageData } from "~/lib/queries";

function AbilityView(props: { data: AbilityPageData }) {
  return (
    <>
      <Title>{props.data.englishName} – Pokédex</Title>
      <h1>{props.data.englishName}</h1>

      <section class="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{props.data.effect}</p>
      </section>

      <section class="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count-line">{props.data.pokemon.length} Pokémon</p>
        <ul class="pokemon-grid">
          <For each={props.data.pokemon}>
            {(pokemon) => <PokemonCard species={pokemon} hidden={pokemon.hidden} />}
          </For>
        </ul>
      </section>
    </>
  );
}

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => getAbilityPageData(params.name ?? ""));

  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()} keyed>
        {(ability) => <AbilityView data={ability} />}
      </Show>
    </>
  );
}
