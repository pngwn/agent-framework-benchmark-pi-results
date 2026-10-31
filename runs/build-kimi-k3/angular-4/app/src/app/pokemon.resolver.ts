import { ResolveFn } from '@angular/router';
import { RESPONSE_INIT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Api } from './api';
import { PokedexData } from './pokedex-data';
import { EvolutionChain, EvolutionNode, Move, Pokemon, PokemonSpecies, VersionGroup } from './models';
import { englishName, humanize, idFromUrl, latestEnglishFlavor } from './util';

export interface MoveRow {
  level: number;
  name: string;
  english: string;
  type: string;
  typeEnglish: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTable {
  method: string;
  label: string;
  rows: MoveRow[];
}

export interface VersionGroupOption {
  name: string;
  label: string;
  order: number;
}

export interface PokemonPageData {
  heading: string;
  dexId: number;
  genus: string | null;
  types: { name: string; english: string }[];
  artwork: string | null;
  height: string;
  weight: string;
  flavor: string | null;
  stats: { label: string; value: number }[];
  total: number;
  abilities: { name: string; label: string; hidden: boolean }[];
  evoChain: EvolutionNode;
  versionGroups: VersionGroupOption[];
  selectedGame: string | null;
  tables: MoveTable[];
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

async function buildMoveTables(
  api: Api,
  typeNames: Map<string, string>,
  pokemon: Pokemon,
  versionGroup: string,
): Promise<MoveTable[]> {
  const entries: { move: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      if (detail.version_group.name !== versionGroup) continue;
      const key = `${move.move.name}|${detail.move_learn_method.name}|${detail.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        move: move.move.name,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at,
      });
    }
  }

  const moveNames = [...new Set(entries.map((e) => e.move))];
  const records = new Map(
    await Promise.all(
      moveNames.map(async (name) => [name, await api.get<Move>(`move/${name}`)] as const),
    ),
  );

  const byMethod = new Map<string, MoveRow[]>();
  for (const entry of entries) {
    const record = records.get(entry.move)!;
    let rows = byMethod.get(entry.method);
    if (!rows) byMethod.set(entry.method, (rows = []));
    rows.push({
      level: entry.level,
      name: entry.move,
      english: englishName(record.names, humanize(record.name)),
      type: record.type.name,
      typeEnglish: typeNames.get(record.type.name) ?? humanize(record.type.name),
      category: record.damage_class ? humanize(record.damage_class.name) : '—',
      power: record.power,
      accuracy: record.accuracy,
      pp: record.pp,
    });
  }

  const rank = (method: string) => {
    const index = METHOD_ORDER.indexOf(method);
    return index === -1 ? METHOD_ORDER.length : index;
  };
  return [...byMethod.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || humanize(a).localeCompare(humanize(b)))
    .map(([method, rows]) => ({ method, label: humanize(method), rows }));
}

export const pokemonResolver: ResolveFn<PokemonPageData | null> = async (route) => {
  const api = inject(Api);
  const data = inject(PokedexData);
  const title = inject(Title);
  const responseInit = inject(RESPONSE_INIT, { optional: true });
  const name = route.paramMap.get('name')!;

  try {
    const species = await api.get<PokemonSpecies>(`pokemon-species/${name}`);
    const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
    const [pokemon, evolution, typeNames] = await Promise.all([
      api.get<Pokemon>(`pokemon/${idFromUrl(variety.pokemon.url)}`),
      api.get<EvolutionChain>(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`),
      data.typeNames(),
    ]);

    const heading = englishName(species.names, humanize(species.name));
    title.setTitle(`${heading} – Pokédex`);

    const versionGroupNames = [
      ...new Set(
        pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)),
      ),
    ];
    const versionGroupRecords = await Promise.all(
      versionGroupNames.map((n) => api.get<VersionGroup>(`version-group/${n}`)),
    );
    const versionGroups = versionGroupRecords
      .map((v) => ({ name: v.name, label: humanize(v.name), order: v.order }))
      .sort((a, b) => a.order - b.order);

    const requested = route.queryParamMap.get('game');
    const selectedGame = versionGroups.some((v) => v.name === requested)
      ? requested!
      : (versionGroups.at(-1)?.name ?? null);
    const tables = selectedGame
      ? await buildMoveTables(api, typeNames, pokemon, selectedGame)
      : [];

    const stats = pokemon.stats.map((s) => ({
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    }));

    return {
      heading,
      dexId: species.id,
      genus: species.genera.find((g) => g.language.name === 'en')?.genus ?? null,
      types: pokemon.types
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((t) => ({
          name: t.type.name,
          english: typeNames.get(t.type.name) ?? humanize(t.type.name),
        })),
      artwork:
        pokemon.sprites.other?.['official-artwork']?.front_default ??
        pokemon.sprites.front_default,
      height: `${(pokemon.height / 10).toFixed(1)} m`,
      weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
      flavor: latestEnglishFlavor(species.flavor_text_entries),
      stats,
      total: stats.reduce((sum, s) => sum + s.value, 0),
      abilities: pokemon.abilities
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((a) => ({
          name: a.ability.name,
          label: humanize(a.ability.name),
          hidden: a.is_hidden,
        })),
      evoChain: evolution.chain,
      versionGroups,
      selectedGame,
      tables,
    };
  } catch {
    title.setTitle('Not found – Pokédex');
    if (responseInit) responseInit.status = 404;
    return null;
  }
};
