import { Title } from "@solidjs/meta";
import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Match, Switch } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCards, { CountText } from "~/components/PokemonCards";
import Section from "~/components/Section";
import { TypeLink } from "~/components/TypeBadge";
import { DASH, pageTitle, show } from "~/lib/format";
import { getMove } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getMove(params.name!),
} satisfies RouteDefinition;

export default function MovePage() {
  const params = useParams();
  const move = createAsync(() => getMove(params.name!));
  return (
    <Switch>
      <Match when={move() === null}>
        <NotFound />
      </Match>
      <Match when={move()}>
        {(m) => (
          <>
            <Title>{pageTitle(m().label)}</Title>
            <h1 class="page-title">{m().label}</h1>
            <dl class="panel facts facts--panel">
              <div>
                <dt>Type</dt>
                <dd>
                  <TypeLink type={m().type} />
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{show(m().category)}</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{show(m().power)}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{show(m().accuracy)}</dd>
              </div>
              <div>
                <dt>PP</dt>
                <dd>{show(m().pp)}</dd>
              </div>
            </dl>
            <Section title="Effect">
              <p>{m().effect || DASH}</p>
            </Section>
            <Section title="Learned by">
              <CountText count={m().learnedBy.length} />
              <PokemonCards cards={m().learnedBy} />
            </Section>
          </>
        )}
      </Match>
    </Switch>
  );
}
