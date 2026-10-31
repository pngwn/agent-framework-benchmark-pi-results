/** Shapes of the PokeAPI resources used by the app. */

export interface NamedRef {
  name: string;
  url: string;
}

export interface NamedList {
  count: number;
  results: NamedRef[];
}

export interface LangName {
  name: string;
  language: NamedRef;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedRef;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: NamedRef;
}

export interface Species {
  id: number;
  name: string;
  names: LangName[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: FlavorTextEntry[];
  evolution_chain: { url: string };
  generation: NamedRef;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface PokemonMove {
  move: NamedRef;
  version_group_details: {
    level_learned_at: number;
    version_group: NamedRef;
    move_learn_method: NamedRef;
  }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  moves: PokemonMove[];
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null };
    };
  };
}

export interface Move {
  id: number;
  name: string;
  names: LangName[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  damage_class: NamedRef;
  type: NamedRef;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorTextEntry[];
  learned_by_pokemon: NamedRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: LangName[];
  effect_entries: EffectEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface TypeRecord {
  id: number;
  name: string;
  names: LangName[];
  damage_relations: {
    no_damage_to: NamedRef[];
    half_damage_to: NamedRef[];
    double_damage_to: NamedRef[];
    no_damage_from: NamedRef[];
    half_damage_from: NamedRef[];
    double_damage_from: NamedRef[];
  };
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface Generation {
  id: number;
  name: string;
  names: LangName[];
  pokemon_species: NamedRef[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

export interface EvolutionLink {
  species: NamedRef;
  evolves_to: EvolutionLink[];
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionLink;
}
