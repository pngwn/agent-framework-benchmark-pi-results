import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { JSX, Show, createEffect } from "solid-js";
import { humanize } from "~/lib/text";


export function PageTitle(props: { text: string }) {
  createEffect(() => {
    if (typeof document !== "undefined") document.title = props.text;
  });
  return <Title>{props.text}</Title>;
}

export function TypeBadge(props: { name: string; label?: string }) {
  return (
    <span class={`type-badge type-${props.name}`}>
      {props.label || humanize(props.name)}
    </span>
  );
}

export function TypeLink(props: { name: string; label?: string; class?: string }) {
  return (
    <A href={`/types/${props.name}`} class={`type-link ${props.class || ""}`}>
      <TypeBadge name={props.name} label={props.label} />
    </A>
  );
}

export type CardData = {
  id: number;
  name: string;
  humanized: string;
  sprite: string;
  types?: string[];
};

export function PokemonCard(props: {
  card: CardData;
  showTypes?: boolean;
  typeLabels?: Map<string, string> | Record<string, string>;
  hidden?: boolean;
}) {
  const typeLabel = (name: string) => {
    const labels = props.typeLabels;
    if (!labels) return humanize(name);
    if (labels instanceof Map) return labels.get(name) || humanize(name);
    return (labels as Record<string, string>)[name] || humanize(name);
  };

  return (
    <li class="pokemon-card">
      <A href={`/pokemon/${props.card.name}`} class="pokemon-card-link">
        <img
          class="card-sprite"
          src={props.card.sprite}
          alt=""
          width="96"
          height="96"
          loading="lazy"
          onError={event => {
            event.currentTarget.style.opacity = "0";
          }}
        />
        <span class="card-number">#{String(props.card.id).padStart(4, "0")}</span>
        <span class="card-name">{props.card.humanized}</span>
        <Show when={props.showTypes && props.card.types?.length}>
          <span class="card-types">
            {props.card.types!.map(name => (
              <TypeBadge name={name} label={typeLabel(name)} />
            ))}
          </span>
        </Show>
        <Show when={props.hidden}>
          <span class="card-hidden">Hidden ability</span>
        </Show>
      </A>
    </li>
  );
}

export function Section(props: {
  title: string;
  id?: string;
  children: JSX.Element;
}) {
  const headingId = `${props.id || props.title.toLowerCase().replace(/\s+/g, "-")}-heading`;
  return (
    <section
      id={props.id}
      class="panel section"
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>{props.title}</h2>
      {props.children}
    </section>
  );
}

export function NotFound() {
  return (
    <main class="page">
      <PageTitle text="Not found – Pokédex" />
      <HttpStatusCode code={404} />
      <h1>Not found</h1>
      <p>
        <A href="/">Back to the Pokédex</A>
      </p>
    </main>
  );
}
