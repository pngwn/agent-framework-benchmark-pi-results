import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

export default function PokemonCard(props) {
  return (
    <li class="pokemon-card">
      <A class="pokemon-card-link" href={`/pokemon/${props.pokemon.name}`}>
        <img
          class="card-sprite"
          src={props.pokemon.sprite}
          alt=""
          width="96"
          height="96"
          loading="lazy"
        />
        <span class="card-dex">{props.pokemon.dex}</span>
        <span class="card-name">{props.pokemon.displayName}</span>
        <Show when={props.showTypes && props.pokemon.types?.length}>
          <span class="type-list">
            <For each={props.pokemon.types}>
              {(type) => (
                <span class={`type-badge type-${type.name}`}>{type.label}</span>
              )}
            </For>
          </span>
        </Show>
      </A>
      <Show when={props.hidden}>
        <span class="hidden-ability">Hidden ability</span>
      </Show>
    </li>
  );
}
