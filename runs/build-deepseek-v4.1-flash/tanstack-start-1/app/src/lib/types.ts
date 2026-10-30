export type TypeRef = {
  name: string
  label: string
}

export type CardData = {
  speciesName: string
  displayName: string
  dexNumber: string
  sprite: string | null
  types?: TypeRef[]
  hiddenAbility?: boolean
}

export type HomeSpecies = {
  id: number
  name: string
  displayName: string
  sprite: string | null
  types: TypeRef[]
  generation: string | null
}

export type CatalogSpecies = {
  id: number
  name: string
  displayName: string
  sprite: string | null
  types: TypeRef[]
  generation: string | null
}

export type HomeData = {
  species: CatalogSpecies[]
  types: TypeRef[]
  generations: Array<{ name: string; label: string }>
}

export type PokemonPageData = {
  found: true
  name: string
  englishName: string
  dexNumber: string
  genus: string
  flavorText: string
  artwork: string | null
  height: string
  weight: string
  types: TypeRef[]
  stats: Array<{ label: string; value: number }>
  statsTotal: number
  abilities: Array<{ name: string; label: string; hidden: boolean }>
  evolution: EvolutionNode
  games: Array<{ name: string; label: string; order: number }>
  selectedGame: string | null
  moveTables: MoveTable[]
}

export type NotFoundData = { found: false }

export type EvolutionNode = {
  name: string
  label: string
  children: EvolutionNode[]
}

export type MoveRow = {
  moveName: string
  moveLabel: string
  type: TypeRef
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
  level: number | null
}

export type MoveTable = {
  method: string
  label: string
  rows: MoveRow[]
}

export type MovePageData = {
  found: true
  name: string
  englishName: string
  type: TypeRef
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  learnedBy: CardData[]
}

export type AbilityPageData = {
  found: true
  name: string
  englishName: string
  effect: string
  pokemon: CardData[]
}

export type TypeListData = {
  types: TypeRef[]
}

export type TypePageData = {
  found: true
  name: string
  englishName: string
  relations: Array<{ term: string; types: TypeRef[] }>
  pokemon: CardData[]
  moves: Array<{ name: string; label: string }>
}

export type HomeSearch = {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export type PokemonSearch = {
  game?: string
}
