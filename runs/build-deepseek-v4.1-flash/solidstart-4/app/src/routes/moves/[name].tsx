import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import TypeBadge from "~/components/TypeBadge";
import { displayValue } from "~/lib/format";
import { getMovePageData, type MovePageData } from "~/lib/queries";

function MoveView(props: { data: MovePageData }) {
  return (
    <>
      <Title>{props.data.englishName} – Pokédex</Title>
      <h1>{props.data.englishName}</h1>

      <dl class="fact-list move-facts">
        <div class="fact">
          <dt>Type</dt>
          <dd>
            <Show when={props.data.type.name} fallback="—">
              <TypeBadge
                name={props.data.type.name}
                label={props.data.type.label}
                link
              />
            </Show>
          </dd>
        </div>
        <div class="fact">
          <dt>Category</dt>
          <dd>{props.data.category || "—"}</dd>
        </div>
        <div class="fact">
          <dt>Power</dt>
          <dd>{displayValue(props.data.power)}</dd>
        </div>
        <div class="fact">
          <dt>Accuracy</dt>
          <dd>{displayValue(props.data.accuracy)}</dd>
        </div>
        <div class="fact">
          <dt>PP</dt>
          <dd>{displayValue(props.data.pp)}</dd>
        </div>
      </dl>

      <section class="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{props.data.effect}</p>
      </section>

      <section class="section" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count-line">{props.data.pokemon.length} Pokémon</p>
        <ul class="pokemon-grid">
          <For each={props.data.pokemon}>
            {(pokemon) => <PokemonCard species={pokemon} />}
          </For>
        </ul>
      </section>
    </>
  );
}

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => getMovePageData(params.name ?? ""));

  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()} keyed>
        {(move) => <MoveView data={move} />}
      </Show>
    </>
  );
}
