import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { For, Match, Switch } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import Section from "~/components/Section";
import { getAbilityPage } from "~/lib/queries";

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => getAbilityPage(params.name));

  return (
    <Switch>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data()}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <h1>{d().en}</h1>

            <Section title="Effect">
              <p>{d().effect}</p>
            </Section>

            <Section title="Pokémon">
              <p class="count">{d().cards.length} Pokémon</p>
              <ul class="cards">
                <For each={d().cards}>
                  {(c) => (
                    <PokemonCard
                      id={c.id}
                      name={c.name}
                      note={c.hidden ? "Hidden ability" : undefined}
                    />
                  )}
                </For>
              </ul>
            </Section>
          </main>
        )}
      </Match>
    </Switch>
  );
}
