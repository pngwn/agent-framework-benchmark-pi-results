import { component$, Slot, type JSXOutput } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Card, EvolutionNode, TypeRef } from "~/lib/data";
import { dexNumber } from "~/lib/format";

export const TypeBadge = component$<{ type: TypeRef; link?: boolean }>(({ type, link }) =>
  link ? (
    <Link href={`/types/${type.name}`} class={`badge type-${type.name}`}>
      {type.label}
    </Link>
  ) : (
    <span class={`badge type-${type.name}`}>{type.label}</span>
  ),
);

export const PokemonCard = component$<{ card: Card }>(({ card }) => (
  <Link href={`/pokemon/${card.name}`} class="card">
    <img src={card.sprite} alt="" width={96} height={96} loading="lazy" class="card-sprite" />
    <span class="card-number">{dexNumber(card.id)}</span>
    <span class="card-name">{card.label}</span>
    {card.types && card.types.length > 0 && (
      <span class="badges">
        {card.types.map((t) => (
          <TypeBadge key={t.name} type={t} />
        ))}
      </span>
    )}
    {card.hidden && <span class="card-note">Hidden ability</span>}
  </Link>
));

export const CardList = component$<{ cards: Card[] }>(({ cards }) => (
  <ul class="card-grid">
    {cards.map((card) => (
      <li key={card.id}>
        <PokemonCard card={card} />
      </li>
    ))}
  </ul>
));

/** A `region` landmark named by its heading. */
export const Section = component$<{ id: string; title: string; class?: string }>((props) => (
  <section id={props.id} aria-labelledby={`${props.id}-heading`} class={["panel", props.class]}>
    <h2 id={`${props.id}-heading`}>{props.title}</h2>
    <Slot />
  </section>
));

function evolutionItem(node: EvolutionNode): JSXOutput {
  return (
    <li key={node.name}>
      <Link href={`/pokemon/${node.name}`}>{node.label}</Link>
      {node.children.length > 0 && <ul>{node.children.map(evolutionItem)}</ul>}
    </li>
  );
}

export const Evolution = component$<{ root: EvolutionNode }>(({ root }) => (
  <ul class="evolution">{evolutionItem(root)}</ul>
));

export const NotFound = component$(() => (
  <>
    <h1>Not found</h1>
    <p>
      <Link href="/">Back to the Pokédex</Link>
    </p>
  </>
));
