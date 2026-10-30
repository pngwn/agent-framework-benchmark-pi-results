import { Title } from "@solidjs/meta";
import { A, createAsync, query, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import Section from "~/components/Section";
import { loadTypePage } from "~/server/data";

const getTypePage = query(loadTypePage, "type-page");

function Relation(props) {
  return (
    <div>
      <dt>{props.term}</dt>
      <dd>
        <Show when={props.types.length} fallback="None">
          <span class="relation-types">
            <For each={props.types}>
              {(type) => (
                <A class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>
                  {type.label}
                </A>
              )}
            </For>
          </span>
        </Show>
      </dd>
    </div>
  );
}

function TypePage(props) {
  const data = props.data;
  return (
    <>
      <Title>{data.englishName} – Pokédex</Title>
      <main class="container">
        <h1>{data.englishName}</h1>

        <Section title="Damage relations">
          <dl class="relations">
            <Relation term="Super effective against" types={data.relations.superEffective} />
            <Relation term="Not very effective against" types={data.relations.notVeryEffective} />
            <Relation term="No effect against" types={data.relations.noEffect} />
            <Relation term="Weak to" types={data.relations.weakTo} />
            <Relation term="Resists" types={data.relations.resists} />
            <Relation term="Immune to" types={data.relations.immuneTo} />
          </dl>
        </Section>

        <Section title="Pokémon">
          <p class="count">{data.pokemon.length} Pokémon</p>
          <ul class="card-grid">
            <For each={data.pokemon}>
              {(pokemon) => <PokemonCard pokemon={pokemon} />}
            </For>
          </ul>
        </Section>

        <Section title="Moves">
          <p class="count">{data.moves.length} moves</p>
          <ul class="move-links">
            <For each={data.moves}>
              {(move) => (
                <li><A href={`/moves/${move.name}`}>{move.label}</A></li>
              )}
            </For>
          </ul>
        </Section>
      </main>
    </>
  );
}

export default function TypeRoute() {
  const params = useParams();
  const data = createAsync(() => getTypePage(params.name));

  return (
    <Show when={data()} fallback={<main class="container"><p>Loading…</p></main>}>
      <Show when={!data().notFound} fallback={<NotFound />}>
        <TypePage data={data()} />
      </Show>
    </Show>
  );
}
