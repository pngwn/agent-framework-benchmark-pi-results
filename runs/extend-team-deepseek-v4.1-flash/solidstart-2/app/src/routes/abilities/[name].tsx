import { Title } from "@solidjs/meta";
import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Match, Switch } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCards, { CountText } from "~/components/PokemonCards";
import Section from "~/components/Section";
import { DASH, pageTitle } from "~/lib/format";
import { getAbility } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getAbility(params.name!),
} satisfies RouteDefinition;

export default function AbilityPage() {
  const params = useParams();
  const ability = createAsync(() => getAbility(params.name!));
  return (
    <Switch>
      <Match when={ability() === null}>
        <NotFound />
      </Match>
      <Match when={ability()}>
        {(a) => (
          <>
            <Title>{pageTitle(a().label)}</Title>
            <h1 class="page-title">{a().label}</h1>
            <Section title="Effect">
              <p>{a().effect || DASH}</p>
            </Section>
            <Section title="Pokémon">
              <CountText count={a().pokemon.length} />
              <PokemonCards cards={a().pokemon} />
            </Section>
          </>
        )}
      </Match>
    </Switch>
  );
}
