export interface Ref {
  name: string;
  url: string;
}

export interface NameEntry {
  name: string;
  language: Ref;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: Ref;
  version?: Ref;
  version_group?: Ref;
}

export interface SpeciesRecord {
  id: number;
  name: string;
  names: NameEntry[];
  flavor_text_entries: FlavorTextEntry[];
  genera: { genus: string; language: Ref }[];
  evolution_chain: { url: string } | null;
  varieties: { is_pokemon?: boolean; is_default: boolean; pokemon: Ref }[];
}

export interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
}

export interface GenerationRecord {
  id: number;
  name: string;
  names: NameEntry[];
  pokemon_species: Ref[];
}

export interface TypeRecord {
  id: number;
  name: string;
  names: NameEntry[];
  damage_relations: Record<string, Ref[]>;
  pokemon: { slot: number; pokemon: Ref }[];
  moves: Ref[];
}

export interface MoveRecord {
  id: number;
  name: string;
  names: NameInfo[];
  type: Ref;
  damage_class: Ref | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: { effect: string; short_effect: string; language: Ref }[];
  flavor_text_entries: FlavorTextEntry[];
  learned_by_pokemon: Ref[];
}

export interface AbilityRecord {
  id: number;
  name: string;
  names: NameInfo[];
  effect_entries: { effect: string; short_effect: string; language: Ref }[];
  flavor_text_entries: FlavorTextEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
}

export interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: Ref;
  types: { slot: number; type: Ref }[];
  abilities: { is_hidden: boolean; slot: number; ability: Ref }[];
  stats: { base_stat: number; effort: number; stat: Ref }[];
  moves: {
    move: Ref;
    version_group_details: {
      level_learned_at: number;
      move_learn_method: Ref;
      version_group: Ref;
      order: number;
    }[];
  }[];
  sprites: {
    front_default: string | null;
    back_default?: string | null;
    other?: Record<string, { front_default?: string | null } | undefined>;
  };
}

export interface EvolutionChainRecord {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  is_baby?: boolean;
  species: Ref;
  evolves_to: EvolutionNode[];
}

export interface NameInfo {
  name: string;
  language: Ref;
}

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(names: NameInfo[] | undefined, fallback: string): string {
  const entry = names?.find((item) => item.language?.name === 'en');
  return entry?.name?.trim() || humanize(fallback);
}

export function latestEnglishFlavor(entries: FlavorTextEntry[] | undefined): string {
  if (!entries?.length) return '';
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.language?.name === 'en') {
      return entry.flavor_text.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

export function formatDex(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function uniqueBy<T>(items: T[], key: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(item);
  }
  return result;
}
