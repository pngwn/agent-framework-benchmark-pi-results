export type Named = { name: string; label: string };

export type Card = {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: Named[];
  hidden?: boolean;
};

export type HomeFilters = { types: Named[]; generations: Named[] };

export type HomeResult = {
  count: number;
  page: number;
  pages: number;
  items: Card[];
};

export type EvolutionNode = { name: string; label: string; children: EvolutionNode[] };

export type PokemonDetail = {
  id: number;
  name: string;
  label: string;
  genus: string;
  types: Named[];
  artwork: string | null;
  height: number;
  weight: number;
  flavor: string;
  stats: { label: string; value: number }[];
  abilities: { name: string; label: string; hidden: boolean }[];
  evolution: EvolutionNode | null;
  games: Named[];
};

export type MoveRow = {
  level: number | null;
  name: string;
  label: string;
  type: Named;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTableData = { method: string; label: string; rows: MoveRow[] };

export type MoveDetail = {
  name: string;
  label: string;
  type: Named;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  learnedBy: Card[];
};

export type AbilityDetail = { name: string; label: string; effect: string; pokemon: Card[] };

export type TypeDetail = {
  name: string;
  label: string;
  relations: { term: string; types: Named[] }[];
  pokemon: Card[];
  moves: Named[];
};

export type CoverageRow = { type: Named; weak: number; resistant: number };

export type TeamResult = { members: Card[]; coverage: CoverageRow[] };
