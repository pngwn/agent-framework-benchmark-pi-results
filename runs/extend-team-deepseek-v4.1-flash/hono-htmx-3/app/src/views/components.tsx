import type { Child, PropsWithChildren } from 'hono/jsx';
import { type Card, type TypeInfo, dexNumber, humanize, spriteUrl } from '../data';

export const Section = ({ id, title, children }: PropsWithChildren<{ id: string; title: string }>) => (
  <section class="panel" id={id} aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>{title}</h2>
    {children}
  </section>
);

export const TypeBadge = ({ type, link = false }: { type: TypeInfo; link?: boolean }) =>
  link ? (
    <a class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>
      {type.label}
    </a>
  ) : (
    <span class={`type-badge type-${type.name}`}>{type.label}</span>
  );

export const CardList = ({ cards, action }: { cards: Card[]; action?: (card: Card) => Child }) => (
  <ul class="card-grid">
    {cards.map((card) => (
      <li class={action ? 'card-item card-item-action' : undefined}>
        <a class="card" href={`/pokemon/${card.name}`}>
          <img src={spriteUrl(card.id)} alt="" width={96} height={96} decoding="async" />
          <span class="card-dex">{dexNumber(card.id)}</span>
          <span class="card-name">{humanize(card.name)}</span>
          {card.types && (
            <span class="card-types">
              {card.types.map((t) => (
                <TypeBadge type={t} />
              ))}
            </span>
          )}
          {card.note && <span class="card-note">{card.note}</span>}
        </a>
        {action?.(card)}
      </li>
    ))}
  </ul>
);

export const TeamButton = ({ species, member, full }: { species: string; member: boolean; full: boolean }) => (
  <div class="team-action">
    <form
      method="post"
      action={`/pokemon/${species}/team`}
      hx-post={`/pokemon/${species}/team`}
      hx-target="closest .team-action"
      hx-swap="outerHTML"
      hx-sync="this:replace"
    >
      <button type="submit" class={`team-button${member ? ' team-button-remove' : ''}`} disabled={!member && full}>
        {member ? 'Remove from team' : 'Add to team'}
      </button>
    </form>
    {!member && full && <span class="team-full">Team is full</span>}
  </div>
);

export const Count = ({ n, noun = 'Pokémon' }: { n: number; noun?: string }) => (
  <p class="count">
    {n} {noun}
  </p>
);

export const Dash = '—';
export const orDash = (v: Child | null | undefined) => (v === null || v === undefined || v === '' ? Dash : v);

export const NotFound = () => (
  <>
    <h1>Not found</h1>
    <p>
      <a href="/">Back to the Pokédex</a>
    </p>
  </>
);
