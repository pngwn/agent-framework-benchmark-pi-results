export interface NamedRef {
  name: string;
  url: string;
}

export interface LanguageRef {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: LanguageRef;
}

export interface Genus {
  name?: string;
  language: LanguageRef;
}

export interface FlavorText {
  flavor_text: string;
  language: LanguageInfo;
}

export interface LanguageInfo {
  name: string;
  url?: string;
}

export interface EvolutionChainRef {
  url: string;
}

export interface Stat {
  base_stat: number;
  effort: number;
  stat: NamedRef;
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedRef;
}

export interface PokemonAbilitySlot {
  ability: NamedRef;
  is_hidden: boolean;
  slot: number;
}

export interface MoveVersionGroupDetail {
  level_learned_at: number;
  version_group: NamedRef;
  move_learn_method: NamedRef;
  order: number | null;
}

export interface PokemonMove {
  move: NamedRef;
  version_group_details: MoveVersionGroupDetail[];
}

export interface OfficialArtwork {
  front_default: string | null;
}

export interface Sprites {
  front_default: string | null;
  other?: {
    'official-artwork'?: OfficialArtwork;
  };
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: PokemonAbilitySlot[];
  moves: PokemonMove[];
  sprites: Sprites;
  stats: Stat[];
  types: PokemonTypeSlot[];
  species: NamedRef;
}

export interface DamageRelations {
  double_damage_to: NamedRef[];
  half_damage_to: NamedRef[];
  no_damage_to: NamedRef[];
  double_damage_from: NamedRef[];
  half_damage_from: NamedRef[];
  no_damage_from: NamedRef[];
}

export interface TypeDetail {
  id: number;
  name: string;
  names: LocalizedName[];
  damage_relations: DamageRelations;
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

export interface MoveDamageClass {
  name: string;
  url: string;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: LanguageRef;
}

export interface Move {
  id: number;
  name: string;
  names: LocalizedName[];
  accuracy: number | null;
  pp: number | null;
  power: number | null;
  damage_class: MoveDamageClass;
  type: NamedRef;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: NamedRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: EffectEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface Species {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: LanguageRef }[];
  flavor_text_entries: FlavorText[];
  varieties: { is_default: boolean; pokemon: NamedRef }[];
  generation: NamedRef;
  evolution_chain: EvolutionChainRef | null;
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
  results: T[];
}

export interface SpeciesRef {
  name: string;
  url: string;
}
