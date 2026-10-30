import { createAsync, useParams } from "@solidjs/router";
import { For, Match, Switch } from "solid-js";
import { NotFound, PageTitle, PokemonCard, Section, TypeLink } from "~/components";
import { MISSING, getMovePage } from "~/lib/api";

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => getMovePage(params.name || ""));

  return (
    <Switch fallback={<Loading />}>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data() !== undefined}>
        <MoveView data={() => data()!} />
      </Match>
    </Switch>
  );
}

function Loading() {
  return (
    <main class="page">
      <h1>Loading…</h1>
    </main>
  );
}

function MoveView(props: { data: () => any }) {
  const data = () => props.data();
  return (
    <main class="page">
      <PageTitle text={`${data().move.label} – Pokédex`} />
      <h1>{data().move.label}</h1>

      <div class="panel facts-panel">
        <dl class="move-facts">
          <dt>Type</dt>
          <dd>
            <TypeLink
              name={data().move.type.name}
              label={data().move.type.label}
            />
          </dd>
          <dt>Category</dt>
          <dd>{data().move.category || MISSING}</dd>
          <dt>Power</dt>
          <dd>{data().move.power ?? MISSING}</dd>
          <dt>Accuracy</dt>
          <dd>{data().move.accuracy ?? MISSING}</dd>
          <dt>PP</dt>
          <dd>{data().move.pp ?? MISSING}</dd>
        </dl>
      </div>

      <Section title="Effect">
        <p>{data().effect}</p>
      </Section>

      <Section title="Learned by">
        <p class="result-count">{data().cards.length} Pokémon</p>
        <ul class="pokemon-grid">
          <For each={data().cards}>
            {(card: any) => <PokemonCard card={card} />}
          </For>
        </ul>
      </Section>
    </main>
  );
}
