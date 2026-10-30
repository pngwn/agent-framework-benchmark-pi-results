import type { Child, PropsWithChildren } from 'hono/jsx'
import {
  dexNumber,
  displayValue,
  formatMeasurement,
  humanize,
  type CardInfo,
  type GlobalData,
  type GenerationInfo,
  type MoveTable,
  type SpeciesInfo,
  type TypeInfo,
  spriteUrl,
} from './data'

export function Layout({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/styles.css" />
        <script src="/static/htmx.min.js" defer></script>
      </head>
      <body>
        <header class="site-header">
          <div class="container header-inner">
            <a class="brand" href="/">
              Pokédex
            </a>
            <nav class="site-nav" aria-label="Main">
              <a href="/">Pokémon</a>
              <a href="/types">Types</a>
            </nav>
          </div>
        </header>
        <main class="container page">{children}</main>
        <footer class="site-footer">
          <div class="container">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </div>
        </footer>
      </body>
    </html>
  )
}

export function pageTitle(heading: string): string {
  return heading === 'Pokémon' ? 'Pokédex' : `${heading} – Pokédex`
}

export function TypeBadge({ name, label }: { name: string; label: string }) {
  return <span class={`type-badge type-${name}`}>{label}</span>
}

export function PokemonCard({ card, types }: { card: CardInfo; types?: { name: string; english: string }[] }) {
  return (
    <li class="pokemon-card">
      <a class="card-link" href={`/pokemon/${card.name}`}>
        <img class="card-sprite" src={card.sprite} alt="" width="96" height="96" />
        <span class="card-dex">{dexNumber(card.id)}</span>
        <span class="card-name">{card.humanized}</span>
      </a>
      {types?.length ? (
        <div class="card-types">
          {types.map((type) => (
            <TypeBadge name={type.name} label={type.english} />
          ))}
        </div>
      ) : null}
      {card.hidden ? <span class="hidden-ability">Hidden ability</span> : null}
    </li>
  )
}

export function PokemonCards({
  cards,
  typeLookup,
}: {
  cards: CardInfo[]
  typeLookup?: GlobalData | Map<number, { name: string; english: string }[]>
}) {
  return (
    <ul class="card-grid">
      {cards.map((card) => {
        let types: { name: string; english: string }[] | undefined
        if (typeLookup instanceof Map) types = typeLookup.get(card.id)
        else if (typeLookup) types = typeLookup.speciesById.get(card.id)?.types
        return <PokemonCard card={card} types={types} />
      })}
    </ul>
  )
}

export type HomeViewData = {
  global: GlobalData
  query: string
  selectedType: TypeInfo | null
  selectedGeneration: GenerationInfo | null
  total: number
  currentPage: number
  totalPages: number
  species: SpeciesInfo[]
}

function homeQuery(data: HomeViewData, page: number): string {
  const params = new URLSearchParams()
  if (data.query) params.set('q', data.query)
  if (data.selectedType) params.set('type', data.selectedType.name)
  if (data.selectedGeneration) params.set('generation', data.selectedGeneration.name)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/?${query}` : '/'
}

function HomeControls({ data }: { data: HomeViewData }) {
  const ajax = {
    'hx-get': '/',
    'hx-target': '#results',
    'hx-swap': 'outerHTML',
    'hx-push-url': 'true',
    'hx-include': 'closest form',
  }
  return (
    <form class="filter-form" action="/" method="get" onsubmit="event.preventDefault()">
      <div class="field search-field">
        <label for="search">Search</label>
        <input
          id="search"
          type="search"
          name="q"
          value={data.query}
          autocomplete="off"
          hx-get="/"
          hx-trigger="input changed delay:250ms, search"
          hx-target="#results"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-include="closest form"
        />
      </div>
      <div class="field">
        <label for="type-filter">Type</label>
        <select id="type-filter" name="type" {...ajax} hx-trigger="change">
          <option value="" selected={!data.selectedType}>
            All types
          </option>
          {data.global.types.map((type) => (
            <option value={type.name} selected={data.selectedType?.name === type.name}>
              {type.english}
            </option>
          ))}
        </select>
      </div>
      <div class="field">
        <label for="generation-filter">Generation</label>
        <select id="generation-filter" name="generation" {...ajax} hx-trigger="change">
          <option value="" selected={!data.selectedGeneration}>
            All generations
          </option>
          {data.global.generations.map((generation) => (
            <option value={generation.name} selected={data.selectedGeneration?.name === generation.name}>
              {generation.english}
            </option>
          ))}
        </select>
      </div>
    </form>
  )
}

export function HomeResults({ data }: { data: HomeViewData }) {
  return (
    <div id="results">
      <p class="result-count">{data.total} Pokémon</p>
      {data.total ? (
        <ul class="card-grid">
          {data.species.map((species) => (
            <PokemonCard
              card={{ id: species.id, name: species.name, humanized: species.humanized, sprite: spriteUrl(species.id) }}
              types={species.types}
            />
          ))}
        </ul>
      ) : (
        <p class="empty-message">No Pokémon found</p>
      )}
      <div class="pagination">
        <span>
          Page {data.currentPage} of {data.totalPages}
        </span>
        {data.currentPage > 1 ? <a href={homeQuery(data, data.currentPage - 1)}>Previous page</a> : null}
        {data.currentPage < data.totalPages ? (
          <a href={homeQuery(data, data.currentPage + 1)}>Next page</a>
        ) : null}
      </div>
    </div>
  )
}

export function HomePage({ data }: { data: HomeViewData }) {
  return (
    <Layout title="Pokédex">
      <h1>Pokémon</h1>
      <HomeControls data={data} />
      <HomeResults data={data} />
    </Layout>
  )
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

function EvolutionList({ nodes }: { nodes: any[] }) {
  return (
    <ul class="evolution-list">
      {nodes.map((node) => (
        <li>
          <a href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</a>
          {node.evolves_to?.length ? <EvolutionList nodes={node.evolves_to} /> : null}
        </li>
      ))}
    </ul>
  )
}

function moveTablesUrl(speciesName: string, game: string, method: string, column: string, direction: string): string {
  const params = new URLSearchParams()
  if (game) params.set('game', game)
  params.set('sort', `${method}:${column}:${direction}`)
  return `/pokemon/${encodeURIComponent(speciesName)}?${params.toString()}`
}

function sortRows(rows: MoveTable['rows'], table: MoveTable, sort: { method: string; column: string; direction: string } | null) {
  const copy = [...rows]
  const missing = (value: unknown) => value === null || value === undefined || value === ''
  if (!sort || sort.method !== table.method) {
    copy.sort((a, b) => {
      if (table.hasLevel) {
        const levelDiff = (a.level ?? 0) - (b.level ?? 0)
        if (levelDiff) return levelDiff
      }
      return a.moveLabel.localeCompare(b.moveLabel)
    })
    return copy
  }
  const column = sort.column
  const descending = sort.direction === 'desc'
  copy.sort((a, b) => {
    const av = (a as any)[column]
    const bv = (b as any)[column]
    if (missing(av) && missing(bv)) return 0
    if (missing(av)) return 1
    if (missing(bv)) return -1
    let comparison: number
    if (typeof av === 'number' && typeof bv === 'number') comparison = av - bv
    else comparison = String(av).localeCompare(String(bv))
    return descending ? -comparison : comparison
  })
  return copy
}

const MOVE_COLUMNS = [
  ['level', 'Level'],
  ['moveLabel', 'Move'],
  ['typeLabel', 'Type'],
  ['category', 'Category'],
  ['power', 'Power'],
  ['accuracy', 'Accuracy'],
  ['pp', 'PP'],
] as const

export function MoveTables({
  speciesName,
  game,
  tables,
  sort,
}: {
  speciesName: string
  game: string
  tables: MoveTable[]
  sort: { method: string; column: string; direction: string } | null
}) {
  return (
    <div id="moves-tables">
      {tables.map((table) => {
        const columns = MOVE_COLUMNS.filter(([column]) => column !== 'level' || table.hasLevel)
        const activeHere = sort?.method === table.method ? sort : null
        const rows = sortRows(table.rows, table, activeHere)
        return (
          <table class="data-table moves-table" id={`moves-${table.method}`}>
            <caption>{table.label}</caption>
            <thead>
              <tr>
                {columns.map(([column, label]) => {
                  const isActive = activeHere?.column === column
                  const nextDirection = isActive && activeHere?.direction === 'asc' ? 'desc' : 'asc'
                  return (
                    <th scope="col" aria-sort={isActive ? (activeHere?.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button
                        type="button"
                        class="sort-button"
                        hx-get={moveTablesUrl(speciesName, game, table.method, column, nextDirection)}
                        hx-target="#moves-tables"
                        hx-swap="outerHTML"
                        hx-push-url="false"
                      >
                        {label}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr>
                  {table.hasLevel ? <td class="level-cell">{row.level}</td> : null}
                  <td>
                    <a href={`/moves/${row.moveName}`}>{row.moveLabel}</a>
                  </td>
                  <td>
                    {row.typeName ? (
                      <a class={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                        {row.typeLabel}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.category}</td>
                  <td>{displayValue(row.power)}</td>
                  <td>{displayValue(row.accuracy)}</td>
                  <td>{displayValue(row.pp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      })}
    </div>
  )
}

export function PokemonPage({
  data,
  tables,
  sort,
}: {
  data: any
  tables: MoveTable[]
  sort: { method: string; column: string; direction: string } | null
}) {
  const { species, pokemon, global, englishName, genus, flavor, gameOptions, selectedGame } = data
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    ''
  const stats = (pokemon.stats as any[]).map((stat) => ({
    key: stat.stat.name,
    label: STAT_LABELS[stat.stat.name] ?? humanize(stat.stat.name),
    value: stat.base_stat,
  }))
  const total = stats.reduce((sum, stat) => sum + stat.value, 0)
  const typeLinks = (pokemon.types as any[])
    .slice()
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => ({
      name: entry.type.name,
      label: global.typeByName.get(entry.type.name)?.english ?? humanize(entry.type.name),
    }))
  const abilities = (pokemon.abilities as any[])
    .slice()
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
  const chainNodes = data.chain?.chain ? [data.chain.chain] : [{ species: { name: species.name }, evolves_to: [] }]

  return (
    <Layout title={`${englishName} – Pokédex`}>
      <h1>{englishName}</h1>
      <div class="panel summary">
        <div class="summary-artwork">
          {artwork ? <img src={artwork} alt={englishName} width="288" height="288" /> : null}
        </div>
        <div class="summary-details">
          <p class="dex-number">{dexNumber(species.id)}</p>
          <p class="genus">{genus}</p>
          <div class="summary-types">
            {typeLinks.map((type) => (
              <a class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>
                {type.label}
              </a>
            ))}
          </div>
          <dl class="measurements">
            <div>
              <dt>Height</dt>
              <dd>{formatMeasurement(pokemon.height, 10, 'm')}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{formatMeasurement(pokemon.weight, 10, 'kg')}</dd>
            </div>
          </dl>
          {flavor ? <p class="flavor-text">{flavor}</p> : null}
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {stats.map((stat) => (
              <tr>
                <th scope="row">{stat.label}</th>
                <td class="stat-value">{stat.value}</td>
                <td class="stat-bar-cell">
                  <span class="stat-track">
                    <span class="stat-bar" style={`width:${Math.min(100, (stat.value / 255) * 100)}%`} />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{total}</td>
              <td class="stat-bar-cell" />
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          {abilities.map((entry) => (
            <li>
              <a href={`/abilities/${entry.ability.name}`}>{humanize(entry.ability.name)}</a>
              {entry.is_hidden ? <span> (hidden)</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <EvolutionList nodes={chainNodes} />
      </section>

      <section class="panel moves-section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="moves-controls">
          <label for="game-select">Game</label>
          <select
            id="game-select"
            name="game"
            hx-get={`/pokemon/${species.name}`}
            hx-trigger="change"
            hx-target="#moves-tables"
            hx-swap="outerHTML"
            hx-push-url="true"
            hx-include="this"
          >
            {gameOptions.map((game) => (
              <option value={game.name} selected={game.name === selectedGame}>
                {game.label}
              </option>
            ))}
          </select>
        </div>
        <MoveTables speciesName={species.name} game={selectedGame} tables={tables} sort={sort} />
      </section>
    </Layout>
  )
}

export function MovePage({ data }: { data: any }) {
  return (
    <Layout title={`${data.englishName} – Pokédex`}>
      <h1>{data.englishName}</h1>
      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd>
            <a href={`/types/${data.typeName}`}>{data.typeLabel}</a>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{data.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{displayValue(data.move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{displayValue(data.move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{displayValue(data.move.pp)}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="result-count">{data.learnedBy.length} Pokémon</p>
        <PokemonCards cards={data.learnedBy} />
      </section>
    </Layout>
  )
}

export function AbilityPage({ data }: { data: any }) {
  return (
    <Layout title={`${data.englishName} – Pokédex`}>
      <h1>{data.englishName}</h1>
      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>
      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCards cards={data.pokemon} />
      </section>
    </Layout>
  )
}

export function TypesPage({ types }: { types: TypeInfo[] }) {
  return (
    <Layout title="Types – Pokédex">
      <h1>Types</h1>
      <ul class="type-grid">
        {types.map((type) => (
          <li>
            <a class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>
              {type.english}
            </a>
          </li>
        ))}
      </ul>
    </Layout>
  )
}

export function TypePage({ data }: { data: any }) {
  return (
    <Layout title={`${data.type.english} – Pokédex`}>
      <h1>{data.type.english}</h1>
      <section class="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations">
          {data.relations.map((relation) => (
            <div>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length ? (
                  relation.types.map((type) => (
                    <>
                      <a class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>
                        {type.label}
                      </a>{' '}
                    </>
                  ))
                ) : (
                  'None'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p class="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCards cards={data.pokemon} />
      </section>

      <section class="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p class="result-count">{data.moves.length} moves</p>
        <ul class="moves-list">
          {data.moves.map((move) => (
            <li>
              <a href={`/moves/${move.name}`}>{move.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  )
}

export function NotFoundPage() {
  return (
    <Layout title="Not found – Pokédex">
      <h1>Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </Layout>
  )
}
