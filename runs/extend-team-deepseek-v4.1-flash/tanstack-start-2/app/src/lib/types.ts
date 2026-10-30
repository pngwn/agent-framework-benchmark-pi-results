export interface TypeRef {
  name: string
  label: string
}

export interface CardData {
  id: number
  name: string
  types?: string[]
  hidden?: boolean
}

export interface IndexEntry {
  id: number
  name: string
  types: string[]
  generation: string | null
}

export interface MoveSummary {
  name: string
  label: string
  type: TypeRef | null
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
}

export interface LearnedMove {
  move: string
  level: number
}

export interface LearnTable {
  method: string
  label: string
  rows: Array<LearnedMove & { details: MoveSummary }>
}

export interface EvolutionNode {
  name: string
  children: EvolutionNode[]
}
