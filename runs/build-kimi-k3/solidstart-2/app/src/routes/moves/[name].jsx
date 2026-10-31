import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { CardList, TypeBadgeLink } from "../../components/Card.jsx";
import { NotFound } from "../../components/NotFound.jsx";
import { Section } from "../../components/Section.jsx";
import { getMovePage } from "../../lib/data.js";
import { EM_DASH } from "../../lib/util.js";

export const route = {
  preload: ({ params }) => getMovePage(params.name),
};

const num = (v) => (v == null ? EM_DASH : v);

function MoveContent(props) {
  const d = () => props.data;
  return (
    <main class="container">
      <Title>{`${d().en} – Pokédex`}</Title>
      <h1>{d().en}</h1>
      <div class="panel">
        <dl class="detail-list">
          <div>
            <dt>Type</dt>
            <dd>{d().type ? <TypeBadgeLink type={d().type} /> : EM_DASH}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{d().category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{num(d().power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{num(d().accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{num(d().pp)}</dd>
          </div>
        </dl>
      </div>
      <Section title="Effect">
        <p>{d().effect}</p>
      </Section>
      <Section title="Learned by">
        <p class="result-count">{d().cards.length} Pokémon</p>
        <CardList cards={d().cards} />
      </Section>
    </main>
  );
}

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => getMovePage(params.name));
  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()}>{(d) => <MoveContent data={d()} />}</Show>
    </>
  );
}
