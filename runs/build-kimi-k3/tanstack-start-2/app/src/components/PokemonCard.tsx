import { dexNumber, humanize } from '../lib/format'
import { TypeBadge } from './TypeBadge'

export type CardType = { name: string; en: string }

/** A Pokémon card: a link to the species page with sprite, dex number and name. */
export function PokemonCard({
  id,
  name,
  sprite,
  types,
  hidden,
}: {
  id: number
  name: string
  sprite: string
  types?: CardType[]
  hidden?: boolean
}) {
  return (
    <li>
      <a className="pokemon-card" href={`/pokemon/${name}`}>
        <img src={sprite} alt="" width={96} height={96} />
        <span className="dex">{dexNumber(id)}</span>
        <span className="name">{humanize(name)}</span>
        {types && types.length > 0 ? (
          <span className="type-list-badges">
            {types.map((t) => (
              <TypeBadge key={t.name} name={t.name} label={t.en} />
            ))}
          </span>
        ) : null}
        {hidden ? <span className="card-note">Hidden ability</span> : null}
      </a>
    </li>
  )
}

export type CardEntryData = { id: number; name: string; sprite: string; hidden: boolean }

export function CardGrid({
  cards,
  hiddenNames,
}: {
  cards: CardEntryData[]
  hiddenNames?: Set<string>
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard
          key={card.id}
          id={card.id}
          name={card.name}
          sprite={card.sprite}
          hidden={card.hidden || hiddenNames?.has(card.name)}
        />
      ))}
    </ul>
  )
}
