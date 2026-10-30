import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonGrid from "~/components/PokemonGrid";
import Section from "~/components/Section";
import TypeBadge from "~/components/TypeBadge";
import { displayValue } from "~/lib/format";
import { moveQuery } from "~/lib/queries";

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => moveQuery(params.name));

  return (
    <Show when={data() !== undefined} fallback={null}>
      <Show when={data()} fallback={<NotFound />}>
      {(move) => (
        <>
          <Title>{move().displayName} – Pokédex</Title>
          <main class="page">
            <h1>{move().displayName}</h1>
            <dl class="detail-list">
              <div>
                <dt>Type</dt>
                <dd>
                  <TypeBadge
                    name={move().typeName}
                    label={move().typeLabel}
                    link
                  />
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{move().category}</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{displayValue(move().power)}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{displayValue(move().accuracy)}</dd>
              </div>
              <div>
                <dt>PP</dt>
                <dd>{displayValue(move().pp)}</dd>
              </div>
            </dl>

            <Section title="Effect">
              <p>{move().effect}</p>
            </Section>

            <Section title="Learned by">
              <p class="result-count">{move().cards.length} Pokémon</p>
              <PokemonGrid cards={move().cards} />
            </Section>
          </main>
        </>
      )}
      </Show>
    </Show>
  );
}
