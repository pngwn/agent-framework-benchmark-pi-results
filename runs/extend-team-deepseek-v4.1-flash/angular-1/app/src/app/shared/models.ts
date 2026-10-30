/** View models sent from the server's data layer to the app. */

export interface NamedRef {
  /** API name, used in URLs. */
  name: string;
  /** Text shown to the user. */
  label: string;
}

export interface Card {
  id: number;
  /** Species API name. */
  name: string;
  hidden?: boolean;
}

export interface HomeEntry {
  id: number;
  name: string;
  types: string[];
  generation: string;
}

export interface HomeVM {
  types: NamedRef[];
  generations: NamedRef[];
  pokemon: HomeEntry[];
}

export interface StatVM {
  label: string;
  value: number;
}

export interface AbilityRef extends NamedRef {
  hidden: boolean;
}

export interface EvolutionNode extends NamedRef {
  evolvesTo: EvolutionNode[];
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: NamedRef;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableVM {
  method: string;
  label: string;
  rows: MoveRow[];
}

export interface PokemonVM {
  id: number;
  name: string;
  title: string;
  genus: string | null;
  types: NamedRef[];
  artwork: string | null;
  height: number;
  weight: number;
  flavorText: string | null;
  stats: StatVM[];
  abilities: AbilityRef[];
  evolution: EvolutionNode;
  games: NamedRef[];
  game: string | null;
  moveTables: MoveTableVM[];
}

export interface MoveVM {
  name: string;
  title: string;
  type: NamedRef | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  pokemon: Card[];
}

export interface AbilityVM {
  name: string;
  title: string;
  effect: string | null;
  pokemon: Card[];
}

export interface TypesVM {
  types: NamedRef[];
}

export interface TeamMember {
  id: number;
  /** Species API name. */
  name: string;
  types: NamedRef[];
}

/** An attacking type and the defending types it hits for 2x, 0.5x or 0x damage. */
export interface AttackType extends NamedRef {
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
}

export interface CoverageRow {
  type: NamedRef;
  weak: number;
  resistant: number;
}

export interface TeamVM {
  members: TeamMember[];
  attackTypes: AttackType[];
  coverage: CoverageRow[];
}

export interface DamageRelationVM {
  label: string;
  types: NamedRef[];
}

export interface TypeVM {
  name: string;
  title: string;
  relations: DamageRelationVM[];
  pokemon: Card[];
  moves: NamedRef[];
}
