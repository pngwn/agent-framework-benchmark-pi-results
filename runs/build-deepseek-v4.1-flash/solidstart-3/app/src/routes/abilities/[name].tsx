import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getAbilityPage } from "~/lib/data";

export default function AbilityPage() {
  const params = useParams();
  const [ability] = createResource(() => params.name, (name) => getAbilityPage(name));

  return (
    <Show
      when={!ability.loading}
      fallback={
        <main class="container">
          <h1>Ability</h1>
        </main>
      }
    >
      <Show when={ability()} fallback={<NotFound />}>
        {(data) => (
          <main class="container">
            <Title>{data().englishName} – Pokédex</Title>
            <h1>{data().englishName}</h1>

            <section class="panel" aria-labelledby="ability-effect-heading">
              <h2 id="ability-effect-heading">Effect</h2>
              <p>{data().effect}</p>
            </section>

            <section class="panel" aria-labelledby="ability-pokemon-heading">
              <h2 id="ability-pokemon-heading">Pokémon</h2>
              <p class="result-count">{data().pokemon.length} Pokémon</p>
              <ul class="pokemon-grid">
                <For each={data().pokemon}>{(card) => <PokemonCard card={card} />}</For>
              </ul>
            </section>
          </main>
        )}
      </Show>
    </Show>
  );
}
