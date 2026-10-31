import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { NotFound } from "~/components/NotFound";
import { PokemonCard } from "~/components/PokemonCard";
import { Section } from "~/components/Section";
import { TypeBadgeLink } from "~/components/TypeBadge";
import { getTypeDetail } from "~/lib/api";

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => getTypeDetail(params.name));

  return (
    <Show when={data() !== undefined} fallback={<p class="loading">Loading…</p>}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <>
            <Title>{`${d().enName} – Pokédex`}</Title>
            <h1>{d().enName}</h1>

            <Section title="Damage relations" headingId="relations-heading">
              <dl class="relations">
                <For each={d().relations}>
                  {(r) => (
                    <div>
                      <dt>{r.term}</dt>
                      <dd>
                        <Show when={r.types.length > 0} fallback="None">
                          <For each={r.types}>{(t) => <TypeBadgeLink type={t} />}</For>
                        </Show>
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
            </Section>

            <Section title="Pokémon" headingId="pokemon-heading">
              <p class="count">{d().pokemon.length} Pokémon</p>
              <ul class="card-grid">
                <For each={d().pokemon}>
                  {(p) => <PokemonCard id={p.id} name={p.name} human={p.human} sprite={p.sprite} />}
                </For>
              </ul>
            </Section>

            <Section title="Moves" headingId="moves-heading">
              <p class="count">{d().moves.length} moves</p>
              <ul class="moves-list">
                <For each={d().moves}>
                  {(m) => (
                    <li>
                      <A href={`/moves/${m.name}`}>{m.human}</A>
                    </li>
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
