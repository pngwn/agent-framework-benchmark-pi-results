// Shared types used by both server loaders and client components.

export type CardData = {
  id: number;
  name: string;
  display: string;
  dex: string;
  sprite: string;
  hidden?: boolean;
};

export type PokedexEntry = {
  id: number;
  name: string;
  display: string;
  types: string[];
  generation: string;
  sprite: string;
};

export type NameDisplay = { name: string; display: string };

export type PokedexIndex = {
  pokemon: PokedexEntry[];
  types: NameDisplay[];
  generations: NameDisplay[];
};

export type MoveRow = {
  level: number | null;
  moveName: string;
  moveDisplay: string;
  typeName: string;
  typeDisplay: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MovesTableData = {
  method: string;
  label: string;
  showLevel: boolean;
  rows: MoveRow[];
};

export type EvoNode = {
  name: string;
  display: string;
  children: EvoNode[];
};
