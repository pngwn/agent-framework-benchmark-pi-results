import { Title } from "@solidjs/meta";
import { A, createAsync, query, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import Section from "~/components/Section";
import { loadMovePage } from "~/server/data";

const getMovePage = query(loadMovePage, "move-page");

function MovePage(props) {
  const data = props.data;
  return (
    <>
      <Title>{data.englishName} – Pokédex</Title>
      <main class="container">
        <h1>{data.englishName}</h1>

        <dl class="fact-pills">
          <div>
            <dt>Type</dt>
            <dd>
              <A class={`type-badge type-${data.type.name}`} href={`/types/${data.type.name}`}>
                {data.type.label}
              </A>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{data.power}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{data.accuracy}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{data.pp}</dd>
          </div>
        </dl>

        <Section title="Effect">
          <p>{data.effect}</p>
        </Section>

        <Section title="Learned by">
          <p class="count">{data.learnedBy.length} Pokémon</p>
          <ul class="card-grid">
            <For each={data.learnedBy}>
              {(pokemon) => <PokemonCard pokemon={pokemon} />}
            </For>
          </ul>
        </Section>
      </main>
    </>
  );
}

export default function MoveRoute() {
  const params = useParams();
  const data = createAsync(() => getMovePage(params.name));

  return (
    <Show when={data()} fallback={<main class="container"><p>Loading…</p></main>}>
      <Show when={!data().notFound} fallback={<NotFound />}>
        <MovePage data={data()} />
      </Show>
    </Show>
  );
}
