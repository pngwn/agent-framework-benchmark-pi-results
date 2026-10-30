import { Title } from "@solidjs/meta";
import { createAsync, query, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import Section from "~/components/Section";
import { loadAbilityPage } from "~/server/data";

const getAbilityPage = query(loadAbilityPage, "ability-page");

function AbilityPage(props) {
  const data = props.data;
  return (
    <>
      <Title>{data.englishName} – Pokédex</Title>
      <main class="container">
        <h1>{data.englishName}</h1>

        <Section title="Effect">
          <p>{data.effect}</p>
        </Section>

        <Section title="Pokémon">
          <p class="count">{data.pokemon.length} Pokémon</p>
          <ul class="card-grid">
            <For each={data.pokemon}>
              {(pokemon) => <PokemonCard pokemon={pokemon} hidden={pokemon.hidden} />}
            </For>
          </ul>
        </Section>
      </main>
    </>
  );
}

export default function AbilityRoute() {
  const params = useParams();
  const data = createAsync(() => getAbilityPage(params.name));

  return (
    <Show when={data()} fallback={<main class="container"><p>Loading…</p></main>}>
      <Show when={!data().notFound} fallback={<NotFound />}>
        <AbilityPage data={data()} />
      </Show>
    </Show>
  );
}
