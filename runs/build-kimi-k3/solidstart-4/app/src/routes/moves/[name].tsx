import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { NotFound } from "~/components/NotFound";
import { PokemonCard } from "~/components/PokemonCard";
import { Section } from "~/components/Section";
import { TypeBadgeLink } from "~/components/TypeBadge";
import { getMoveDetail } from "~/lib/api";

const MISSING = "—";

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => getMoveDetail(params.name));

  return (
    <Show when={data() !== undefined} fallback={<p class="loading">Loading…</p>}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <>
            <Title>{`${d().enName} – Pokédex`}</Title>
            <h1>{d().enName}</h1>
            <div class="facts-card">
            <dl class="facts move-facts">
              <div>
                <dt>Type</dt>
                <dd>
                  <Show when={d().type} fallback={MISSING}>
                    {(t) => <TypeBadgeLink type={t()} />}
                  </Show>
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{d().category}</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{d().power ?? MISSING}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{d().accuracy ?? MISSING}</dd>
              </div>
              <div>
                <dt>PP</dt>
                <dd>{d().pp ?? MISSING}</dd>
              </div>
            </dl>
            </div>

            <Section title="Effect" headingId="effect-heading">
              <p>{d().effect}</p>
            </Section>

            <Section title="Learned by" headingId="learned-by-heading">
              <p class="count">{d().learners.length} Pokémon</p>
              <ul class="card-grid">
                <For each={d().learners}>
                  {(p) => <PokemonCard id={p.id} name={p.name} human={p.human} sprite={p.sprite} />}
                </For>
              </ul>
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
