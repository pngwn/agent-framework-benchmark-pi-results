import { component$ } from '@builder.io/qwik';
import { dexNumber } from '../lib/format';

export interface CardItem {
  id: number;
  speciesName: string;
  human: string;
  sprite: string;
  hidden?: boolean;
  types?: Array<{ api: string; en: string }>;
}

/** A list of Pokémon cards: one link per list item, ordered by dex number. */
export const CardGrid = component$<{ cards: CardItem[] }>(({ cards }) => {
  return (
    <ul class="card-grid">
      {cards.map((c) => (
        <li key={c.id}>
          <a class="poke-card" href={`/pokemon/${c.speciesName}`}>
            <img src={c.sprite} alt="" width={96} height={96} loading="lazy" />
            <span class="poke-num">{dexNumber(c.id)}</span>
            <span class="poke-name">{c.human}</span>
            {c.types && (
              <span class="badge-list">
                {c.types.map((t) => (
                  <span key={t.api} class={`type-badge type-${t.api}`}>
                    {t.en}
                  </span>
                ))}
              </span>
            )}
            {c.hidden && <span class="poke-note">Hidden ability</span>}
          </a>
        </li>
      ))}
    </ul>
  );
});
