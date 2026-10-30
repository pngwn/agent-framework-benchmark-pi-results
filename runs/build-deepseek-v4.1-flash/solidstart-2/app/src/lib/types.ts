export interface NamedReference {
  name: string;
  url: string;
}

export interface LanguageName {
  name: string;
  language: NamedReference;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedReference;
  version?: NamedReference;
  version_group?: NamedReference;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  names: LanguageName[];
  genera: Array<{ genus: string; language: NamedReference }>;
  flavor_text_entries: FlavorTextEntry[];
  generation: NamedReference;
  evolution_chain: { url: string } | null;
  varieties: Array<{ is_default: boolean; pokemon: NamedReference }>;
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: NamedReference;
  abilities: Array<{ is_hidden: boolean; slot: number; ability: NamedReference | null }>;
  stats: Array<{ base_stat: number; effort: number; stat: NamedReference }>;
  types: Array<{ slot: number; type: NamedReference }>;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: { front_default: string | null };
    };
  };
  moves: Array<{
    move: NamedReference;
    version_group_details: Array<{
      level_learned_at: number;
      order?: number | null;
      version_group: NamedReference;
      move_learn_method: NamedReference;
    }>;
  }>;
}

export interface EvolutionNode {
  species: NamedReference;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface Move {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  type: NamedReference;
  damage_class: NamedReference | null;
  names: LanguageName[];
  effect_entries: Array<{ short_effect: string; effect: string; language: NamedReference }>;
  flavor_text_entries: FlavorTextEntry[];
  learned_by_pokemon: NamedReference[];
}

export interface Ability {
  id: number;
  name: string;
  names: LanguageName[];
  effect_entries: Array<{ short_effect: string; effect: string; language: NamedReference }>;
  flavor_text_entries: FlavorTextEntry[];
  pokemon: Array<{ is_hidden: boolean; slot: number; pokemon: NamedReference }>;
}

export interface DamageRelations {
  double_damage_to: NamedReference[];
  half_damage_to: NamedReference[];
  no_damage_to: NamedReference[];
  double_damage_from: NamedReference[];
  half_damage_from: NamedReference[];
  no_damage_from: NamedReference[];
}

export interface PokemonType {
  id: number;
  name: string;
  names: LanguageName[];
  damage_relations: DamageRelations;
  pokemon: Array<{ slot: number; pokemon: NamedReference }>;
  moves: NamedReference[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

export interface TypeOption {
  name: string;
  label: string;
  order: number;
}

export interface GenerationOption {
  name: string;
  label: string;
  order: number;
}

export interface CatalogSpecies {
  id: number;
  name: string;
  displayName: string;
  generation: string;
  types: Array<{ name: string; label: string; slot: number }>;
}

export interface Catalog {
  species: CatalogSpecies[];
  speciesById: Map<number, CatalogSpecies>;
  speciesByName: Map<string, CatalogSpecies>;
  types: TypeOption[];
  generations: GenerationOption[];
}

export interface CardData {
  id: number;
  name: string;
  displayName: string;
  sprite: string;
  types: Array<{ name: string; label: string }>;
  hidden?: boolean;
}

export interface MoveRowData {
  method: string;
  level: number;
  moveName: string;
  moveApiName: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  name: string;
  label: string;
  rows: MoveRowData[];
}

export interface EvolutionViewNode {
  name: string;
  displayName: string;
  children: EvolutionViewNode[];
}
