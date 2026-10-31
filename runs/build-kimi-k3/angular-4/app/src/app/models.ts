/** Shapes of the PokeAPI resources the app uses (fields we read only). */

export interface NamedResourceRef {
  name: string;
  url: string;
}

export interface ListPage<T> {
  count: number;
  results: T[];
}

export interface LocalizedName {
  name: string;
  language: NamedResourceRef;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: NamedResourceRef }[];
  flavor_text_entries: {
    flavor_text: string;
    language: NamedResourceRef;
    version: NamedResourceRef;
  }[];
  evolution_chain: { url: string };
  varieties: { is_default: boolean; pokemon: NamedResourceRef }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number; // decimetres
  weight: number; // hectograms
  species: NamedResourceRef;
  types: { slot: number; type: NamedResourceRef }[];
  stats: { base_stat: number; stat: NamedResourceRef }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedResourceRef }[];
  moves: {
    move: NamedResourceRef;
    version_group_details: {
      level_learned_at: number;
      move_learn_method: NamedResourceRef;
      version_group: NamedResourceRef;
    }[];
  }[];
  sprites: {
    front_default: string | null;
    other?: {
      ['official-artwork']?: { front_default: string | null };
      home?: { front_default: string | null };
    };
  };
}

export interface Move {
  id: number;
  name: string;
  names: LocalizedName[];
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: NamedResourceRef;
  damage_class: NamedResourceRef | null;
  effect_entries: { effect: string; short_effect: string; language: NamedResourceRef }[];
  flavor_text_entries: {
    flavor_text: string;
    language: NamedResourceRef;
    version_group: NamedResourceRef;
  }[];
  learned_by_pokemon: NamedResourceRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: { effect: string; short_effect: string; language: NamedResourceRef }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedResourceRef }[];
}

export interface PokeType {
  id: number;
  name: string;
  names: LocalizedName[];
  damage_relations: Record<
    | 'double_damage_to'
    | 'half_damage_to'
    | 'no_damage_to'
    | 'double_damage_from'
    | 'half_damage_from'
    | 'no_damage_from',
    NamedResourceRef[]
  >;
  pokemon: { slot: number; pokemon: NamedResourceRef }[];
  moves: NamedResourceRef[];
}

export interface Generation {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon_species: NamedResourceRef[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  species: NamedResourceRef;
  evolves_to: EvolutionNode[];
}
