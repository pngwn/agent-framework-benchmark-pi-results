import { component$, Slot } from "@builder.io/qwik";
import { dexNumber, humanize } from "../lib/format";

/** A region landmark named by its heading. */
export const Section = component$<{ title: string; id?: string }>((props) => {
  const headingId = `${props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section id={props.id} aria-labelledby={headingId} class="panel">
      <h2 id={headingId} class="panel-title">
        {props.title}
      </h2>
      <Slot />
    </section>
  );
});

export interface CardItem {
  id: number;
  name: string;
  note?: string;
}

/** A list of Pokémon cards: one card per listitem, ordered by dex number. */
export const PokemonCardList = component$<{
  items: CardItem[];
  sprites: string;
}>((props) => (
  <ul class="cards">
    {props.items.map((p) => (
      <li class="card" key={p.id}>
        <a href={`/pokemon/${p.name}`}>
          <img
            src={`${props.sprites}/${p.id}.png`}
            alt=""
            width={96}
            height={96}
            loading="lazy"
          />
          <span class="card-dex">{dexNumber(p.id)}</span>
          <span class="card-name">{humanize(p.name)}</span>
          {p.note ? <span class="card-note">{p.note}</span> : null}
        </a>
      </li>
    ))}
  </ul>
));

export const TypeBadgeLink = component$<{ name: string; label: string }>(
  (props) => (
    <a class={`type-badge t-${props.name}`} href={`/types/${props.name}`}>
      {props.label}
    </a>
  ),
);

export const NotFound = component$(() => (
  <>
    <h1>Not found</h1>
    <p>
      <a href="/">Back to the Pokédex</a>
    </p>
  </>
));
