export interface CardType {
  name: string
  label: string
  slot: number
}

export interface PokemonCardData {
  id: number
  name: string
  label: string
  sprite: string
  types: CardType[]
  hidden?: boolean
}

export interface FilterOption {
  name: string
  label: string
}

export interface HomeData {
  count: number
  page: number
  totalPages: number
  cards: PokemonCardData[]
  types: FilterOption[]
  generations: FilterOption[]
  q: string
  type: string
  generation: string
}

export interface EvolutionNode {
  name: string
  label: string
  children: EvolutionNode[]
}

export interface MoveRow {
  level: number | null
  moveName: string
  moveLabel: string
  typeName: string
  typeLabel: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export interface MoveTableData {
  method: string
  label: string
  rows: MoveRow[]
}

export interface PokemonPageData {
  found: true
  name: string
  speciesName: string
  englishName: string
  dexNumber: string
  genus: string
  flavor: string
  height: number
  weight: number
  artwork: string | null
  sprite: string | null
  types: Array<{ name: string; label: string }>
  stats: Array<{ label: string; value: number }>
  total: number
  abilities: Array<{ name: string; label: string; hidden: boolean }>
  evolution: EvolutionNode | null
  games: FilterOption[]
  selectedGame: string
  moveTables: MoveTableData[]
}

export interface MovePageData {
  found: true
  name: string
  label: string
  type: { name: string; label: string }
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  pokemon: PokemonCardData[]
}

export interface AbilityPageData {
  found: true
  name: string
  label: string
  effect: string
  pokemon: PokemonCardData[]
}

export interface DamageRelation {
  label: string
  types: Array<{ name: string; label: string }>
}

export interface TypePageData {
  found: true
  name: string
  label: string
  relations: DamageRelation[]
  pokemon: PokemonCardData[]
  moves: Array<{ name: string; label: string }>
}

export type TypeListData = FilterOption[]
