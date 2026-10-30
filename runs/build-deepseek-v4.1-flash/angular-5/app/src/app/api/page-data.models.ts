export interface DisplayType {
  name: string;
  displayName: string;
}

export interface EvolutionNode {
  name: string;
  displayName: string;
  children: EvolutionNode[];
}

export interface MoveRowData {
  level: number | null;
  moveName: string;
  moveDisplay: string;
  typeName: string;
  typeDisplay: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  method: string;
  methodKey: string;
  isLevelUp: boolean;
  rows: MoveRowData[];
}

export interface GameOption {
  name: string;
  label: string;
}

export interface HomePageData {
  species: { id: number; name: string; displayName: string }[];
  types: DisplayType[];
  generations: { name: string; label: string; speciesIds: number[] }[];
  typeByPokemon: Map<number, DisplayType[]>;
  typeSpeciesIds: Map<string, number[]>;
  generationSpeciesIds: Map<string, number[]>;
}

export interface PokemonPageData {
  id: number;
  displayName: string;
  genus: string;
  flavor: string;
  types: DisplayType[];
  artworkUrl: string;
  height: string;
  weight: string;
  stats: { label: string; value: number; percent: number }[];
  total: number;
  abilities: { name: string; displayName: string; hidden: boolean }[];
  evolution: EvolutionNode[];
  games: GameOption[];
  selectedGame: string;
  tables: MoveTableData[];
}

export interface MovePageData {
  id: number;
  displayName: string;
  type: DisplayType;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  cards: import('./pokeapi.models').CardData[];
}

export interface AbilityPageData {
  id: number;
  displayName: string;
  effect: string;
  cards: import('./pokeapi.models').CardData[];
}

export interface TypePageData {
  name: string;
  displayName: string;
  relations: { term: string; types: DisplayType[] }[];
  cards: import('./pokeapi.models').CardData[];
  moves: { name: string; displayName: string }[];
}

export interface TypeListPageData {
  types: DisplayType[];
}
