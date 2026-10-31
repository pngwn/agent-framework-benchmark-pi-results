import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { NotFound } from "~/components/NotFound";
import { PokemonCard } from "~/components/PokemonCard";
import { Section } from "~/components/Section";
import { getAbilityDetail } from "~/lib/api";

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => getAbilityDetail(params.name));

  return (
    <Show when={data() !== undefined} fallback={<p class="loading">Loading…</p>}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <>
            <Title>{`${d().enName} – Pokédex`}</Title>
            <h1>{d().enName}</h1>
            <Section title="Effect" headingId="effect-heading">
              <p>{d().effect}</p>
            </Section>
            <Section title="Pokémon" headingId="pokemon-heading">
              <p class="count">{d().pokemon.length} Pokémon</p>
              <ul class="card-grid">
                <For each={d().pokemon}>
                  {(p) => (
                    <PokemonCard
                      id={p.id}
                      name={p.name}
                      human={p.human}
                      sprite={p.sprite}
                      note={p.hidden ? "Hidden ability" : undefined}
                    />
                  )}
                </For>
              </ul>
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
