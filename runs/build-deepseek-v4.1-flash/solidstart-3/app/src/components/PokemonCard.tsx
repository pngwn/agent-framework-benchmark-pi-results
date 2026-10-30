import { A } from "@solidjs/router";
import { formatDex, typeLabel } from "~/lib/format";

export interface CardData {
  id: number;
  name: string;
  label: string;
  types?: string[];
  hidden?: boolean;
}

export default function PokemonCard(props: { card: CardData; showTypes?: boolean }) {
  return (
    <li class="pokemon-card">
      <A href={`/pokemon/${props.card.name}`} class="pokemon-card-link">
        <img
          class="card-sprite"
          src={`/media/sprites/pokemon/${props.card.id}.png`}
          alt=""
          loading="lazy"
          width="96"
          height="96"
        />
        <span class="card-dex">{formatDex(props.card.id)}</span>
        <span class="card-name">{props.card.label}</span>
      </A>
      {props.showTypes && (props.card.types?.length ?? 0) > 0 && (
        <ul class="card-types" aria-label="Types">
          {props.card.types!.map((type) => (
            <li>
              <span class={`type-badge type-${type}`}>{typeLabel(type)}</span>
            </li>
          ))}
        </ul>
      )}
      {props.card.hidden && <span class="hidden-ability">Hidden ability</span>}
    </li>
  );
}

