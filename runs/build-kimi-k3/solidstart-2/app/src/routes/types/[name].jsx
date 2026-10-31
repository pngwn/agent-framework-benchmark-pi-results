import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { CardList, TypeBadgeLink } from "../../components/Card.jsx";
import { NotFound } from "../../components/NotFound.jsx";
import { Section } from "../../components/Section.jsx";
import { getTypePage } from "../../lib/data.js";

export const route = {
  preload: ({ params }) => getTypePage(params.name),
};

function TypeContent(props) {
  const d = () => props.data;
  return (
    <main class="container">
      <Title>{`${d().en} – Pokédex`}</Title>
      <h1>{d().en}</h1>
      <Section title="Damage relations">
        <dl class="relations">
          <For each={d().relations}>
            {(r) => (
              <div class="relation">
                <dt>{r.label}</dt>
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
      <Section title="Pokémon">
        <p class="result-count">{d().cards.length} Pokémon</p>
        <CardList cards={d().cards} />
      </Section>
      <Section title="Moves">
        <p class="result-count">{d().moves.length} moves</p>
        <ul class="move-list">
          <For each={d().moves}>
            {(m) => (
              <li>
                <A href={`/moves/${m.name}`}>{m.human}</A>
              </li>
            )}
          </For>
        </ul>
      </Section>
    </main>
  );
}

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => getTypePage(params.name));
  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()}>{(d) => <TypeContent data={d()} />}</Show>
    </>
  );
}
