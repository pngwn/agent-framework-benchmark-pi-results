import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { CardList } from "../../components/Card.jsx";
import { NotFound } from "../../components/NotFound.jsx";
import { Section } from "../../components/Section.jsx";
import { getAbilityPage } from "../../lib/data.js";

export const route = {
  preload: ({ params }) => getAbilityPage(params.name),
};

function AbilityContent(props) {
  const d = () => props.data;
  return (
    <main class="container">
      <Title>{`${d().en} – Pokédex`}</Title>
      <h1>{d().en}</h1>
      <Section title="Effect">
        <p>{d().effect}</p>
      </Section>
      <Section title="Pokémon">
        <p class="result-count">{d().cards.length} Pokémon</p>
        <CardList
          cards={d().cards}
          extra={(card) => (card.hidden ? <span class="hidden-note">Hidden ability</span> : null)}
        />
      </Section>
    </main>
  );
}

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => getAbilityPage(params.name));
  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()}>{(d) => <AbilityContent data={d()} />}</Show>
    </>
  );
}
