import { Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { moveQuery } from "~/lib/queries";
import { emDash } from "~/lib/format";
import Section from "~/components/Section";
import NotFound from "~/components/NotFound";
import PokemonCards from "~/components/PokemonCards";
import { TypeBadgeLink } from "~/components/Badge";

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => moveQuery(params.name ?? ""));

  return (
    <Show when={data() !== undefined}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <h1>{d().en}</h1>
            <dl class="facts panel facts-panel">
              <Show when={d().type}>
                {(t) => (
                  <div>
                    <dt>Type</dt>
                    <dd>
                      <TypeBadgeLink name={t().name} label={t().en} />
                    </dd>
                  </div>
                )}
              </Show>
              <div>
                <dt>Category</dt>
                <dd>{d().category ?? "—"}</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{emDash(d().power)}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{emDash(d().accuracy)}</dd>
              </div>
              <div>
                <dt>PP</dt>
                <dd>{emDash(d().pp)}</dd>
              </div>
            </dl>
            <Section title="Effect">
              <p>{d().effect ?? "—"}</p>
            </Section>
            <Section title="Learned by">
              <p class="count">{d().cards.length} Pokémon</p>
              <PokemonCards cards={d().cards} />
            </Section>
          </main>
        )}
      </Show>
    </Show>
  );
}
