export interface NamedRef {
  name: string;
  url: string;
}

export interface ListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LanguageRef {
  name: string;
  url: string;
}

export interface NameEntry {
  name: string;
  language: LanguageRef;
}

export interface GenusEntry {
  genus: string;
  language: LanguageRef;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: LanguageRef;
  version: NamedRef;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: LanguageRef;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  names: NameEntry[];
  genera: GenusEntry[];
  flavor_text_entries: FlavorTextEntry[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    front_shiny?: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null; front_shiny: string | null };
      home?: { front_default: string | null };
      dream_world?: { front_default: string | null };
    };
  };
  types: { slot: number; type: { name: string; url: string } }[];
  stats: { base_stat: number; effort: number; stat: { name: string; url: string } }[];
  abilities: { ability: { name: string; url: string }; is_hidden: boolean; slot: number }[];
  moves: {
    move: { name: string; url: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string; url: string };
      order?: number;
      version_group: { name: string; url: string };
    }[];
  }[];
}

export interface Move {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  priority: number;
  type: { name: string; url: string };
  damage_class: { name: string; url: string };
  names: NameEntry[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorTextEntry[];
  learned_by_pokemon: NamedRef[];
  contest_type?: NamedRef | null;
}

export interface Ability {
  id: number;
  name: string;
  names: NameEntry[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorTextEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface DamageRelations {
  double_damage_to: NamedRef[];
  half_damage_to: NamedRef[];
  no_damage_to: NamedRef[];
  double_damage_from: NamedRef[];
  half_damage_from: NamedRef[];
  no_damage_from: NamedRef[];
}

export interface TypeData {
  id: number;
  name: string;
  names: NameEntry[];
  damage_relations: DamageRelations;
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface Generation {
  id: number;
  name: string;
  names: NameEntry[];
  pokemon_species: NamedRef[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
  names?: NameEntry[];
}

export interface EvolutionDetail {
  trigger?: NamedRef;
  min_level?: number | null;
}

export interface EvolutionLink {
  species: NamedRef;
  evolution_details: EvolutionDetail[];
  evolves_to: EvolutionLink[];
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionLink;
}

export interface CardData {
  id: number;
  speciesName: string;
  displayName: string;
  dex: string;
  spriteUrl: string;
  types: { name: string; displayName: string }[];
  hiddenAbility?: boolean;
}

export interface TypeInfo {
  name: string;
  displayName: string;
  damageRelations: {
    doubleDamageTo: string[];
    halfDamageTo: string[];
    noDamageTo: string[];
    doubleDamageFrom: string[];
    halfDamageFrom: string[];
    noDamageFrom: string[];
  };
  pokemonIds: { id: number; slot: number }[];
  moves: NamedRef[];
}

export interface GenerationInfo {
  name: string;
  label: string;
  speciesIds: number[];
}
