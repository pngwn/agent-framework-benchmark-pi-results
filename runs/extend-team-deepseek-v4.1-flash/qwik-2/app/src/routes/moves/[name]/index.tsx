import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList, NotFound, Section, TypeBadge } from "~/components/ui";
import { movePage } from "~/lib/data";
import { DASH, orDash, pageTitle } from "~/lib/format";

export const useMove = routeLoader$(async ({ params, status }) => {
  const data = await movePage(params.name);
  if (!data) status(404);
  return data;
});

export default component$(() => {
  const loader = useMove();
  const move = loader.value;
  if (!move) return <NotFound />;
  return (
    <>
      <h1>{move.title}</h1>
      <dl class="panel facts">
        <div>
          <dt>Type</dt>
          <dd>{move.type ? <TypeBadge type={move.type} link /> : DASH}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orDash(move.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(move.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{orDash(move.effect)}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p class="count">{move.learnedBy.length} Pokémon</p>
        <CardList cards={move.learnedBy} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const move = resolveValue(useMove);
  return { title: pageTitle(move ? move.title : "Not found") };
};
