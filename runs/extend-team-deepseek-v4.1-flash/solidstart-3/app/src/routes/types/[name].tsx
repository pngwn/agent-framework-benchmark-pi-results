import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { For, Match, Show, Switch } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCards, { CountText } from "~/components/PokemonCards";
import Section from "~/components/Section";
import { TypeLink } from "~/components/TypeBadge";
import { pageTitle } from "~/lib/format";
import { getType } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getType(params.name!),
} satisfies RouteDefinition;

export default function TypePage() {
  const params = useParams();
  const type = createAsync(() => getType(params.name!));
  return (
    <Switch>
      <Match when={type() === null}>
        <NotFound />
      </Match>
      <Match when={type()}>
        {(t) => (
          <>
            <Title>{pageTitle(t().label)}</Title>
            <h1 class="page-title">{t().label}</h1>
            <Section title="Damage relations">
              <dl class="relations">
                <For each={t().relations}>
                  {(relation) => (
                    <div>
                      <dt>{relation.term}</dt>
                      <dd>
                        <Show when={relation.types.length} fallback="None">
                          <ul class="badge-list">
                            <For each={relation.types}>
                              {(related) => (
                                <li>
                                  <TypeLink type={related} />
                                </li>
                              )}
                            </For>
                          </ul>
                        </Show>
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
            </Section>
            <Section title="Pokémon">
              <CountText count={t().pokemon.length} />
              <PokemonCards cards={t().pokemon} />
            </Section>
            <Section title="Moves">
              <CountText count={t().moves.length} noun="moves" />
              <ul class="move-columns">
                <For each={t().moves}>
                  {(move) => (
                    <li>
                      <A href={`/moves/${move.name}`}>{move.label}</A>
                    </li>
                  )}
                </For>
              </ul>
            </Section>
          </>
        )}
      </Match>
    </Switch>
  );
}
