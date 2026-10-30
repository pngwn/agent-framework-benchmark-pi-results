export interface NamedRef {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: NamedRef;
}

export interface FlavorText {
  flavor_text: string;
  language: NamedRef;
  version?: NamedRef;
  version_group?: NamedRef;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: NamedRef;
}

export interface SpeciesListItem {
  id: number;
  name: string;
  url: string;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  order: number;
  names: LocalizedName[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: FlavorText[];
  evolution_chain: { url: string };
  generation: NamedRef;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  moves: {
    move: NamedRef;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedRef;
      move_learn_method: NamedRef;
      order: number | null;
    }[];
  }[];
  species: NamedRef;
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null };
      home?: { front_default: string | null };
      'dream-world'?: { front_default: string | null };
    };
  };
  stats: { base_stat: number; effort: number; stat: NamedRef }[];
  types: { slot: number; type: NamedRef }[];
}

export interface TypeDamageRelations {
  double_damage_to: NamedRef[];
  half_damage_to: NamedRef[];
  no_damage_to: NamedRef[];
  double_damage_from: NamedRef[];
  half_damage_from: NamedRef[];
  no_damage_from: NamedRef[];
}

export interface PokemonType {
  id: number;
  name: string;
  names: LocalizedName[];
  damage_relations: TypeDamageRelations;
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface Generation {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon_species: NamedRef[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

export interface Move {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damage_class: NamedRef;
  type: NamedRef;
  learned_by_pokemon: NamedRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: EffectEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface EvolutionNode {
  species: NamedRef;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface ListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
