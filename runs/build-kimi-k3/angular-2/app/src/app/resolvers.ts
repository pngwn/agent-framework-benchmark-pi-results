import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Ability, EvolutionLink, Move, Pokemon, Species, TypeRecord } from './models';
import { CardData, DexService, SpeciesEntry, TypeInfo } from './dex.service';
import { PokeApiService } from './poke-api.service';
import {
  collapseWhitespace,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from './utils';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const DAMAGE_RELATIONS: [keyof TypeRecord['damage_relations'], string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export interface HomeData {
  entries: SpeciesEntry[];
  typeOptions: TypeInfo[];
  generationOptions: TypeInfo[];
}

export interface MoveRow {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MovesTableData {
  method: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

export interface PokemonPageData {
  englishName: string;
  id: number;
  genus: string;
  types: TypeInfo[];
  artwork: string | null;
  height: string;
  weight: string;
  flavor: string | null;
  stats: { label: string; value: number }[];
  total: number;
  abilities: { name: string; label: string; hidden: boolean }[];
  chain: EvolutionLink;
  games: TypeInfo[];
  selectedGame: string;
  tables: MovesTableData[];
}

export interface MovePageData {
  englishName: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  learnedBy: CardData[];
}

export interface AbilityPageData {
  englishName: string;
  effect: string;
  pokemon: CardData[];
}

export interface TypePageData {
  englishName: string;
  relations: { term: string; types: TypeInfo[] }[];
  pokemon: CardData[];
  moves: TypeInfo[];
}

function typeLabel(map: Map<string, string>, name: string): string {
  return map.get(name) ?? humanize(name);
}

/** Home page: the full species index plus filter options. */
export const homeResolver: ResolveFn<HomeData> = () => {
  const dex = inject(DexService);
  return forkJoin({
    entries: dex.speciesIndex$,
    types: dex.typeRecords$,
    generations: dex.generations$,
  }).pipe(
    map(({ entries, types, generations }) => ({
      entries,
      typeOptions: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
      generationOptions: generations.map((g) => ({
        name: g.name,
        label: englishName(g.names, g.name),
      })),
    })),
  );
};

/** Pokémon detail page. `null` means the species doesn't exist. */
export const pokemonResolver: ResolveFn<PokemonPageData | null> = (route) => {
  const api = inject(PokeApiService);
  const dex = inject(DexService);
  const name = route.paramMap.get('name') ?? '';
  const requestedGame = route.queryParamMap.get('game');

  return api.get<Species>(`pokemon-species/${encodeURIComponent(name)}/`).pipe(
    switchMap((species) => {
      const defaultVariety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
      return forkJoin({
        pokemon: api.get<Pokemon>(`pokemon/${idFromUrl(defaultVariety.pokemon.url)}/`),
        chain: api.get<{ chain: EvolutionLink }>(
          `evolution-chain/${idFromUrl(species.evolution_chain.url)}/`,
        ),
        versionGroups: dex.versionGroups$,
        typeNames: dex.typeNameMap$,
      }).pipe(
        switchMap(({ pokemon, chain, versionGroups, typeNames }) => {
          const orderOf = new Map(versionGroups.map((v) => [v.name, v.order] as const));
          const gameNames = new Set<string>();
          for (const move of pokemon.moves) {
            for (const detail of move.version_group_details) {
              gameNames.add(detail.version_group.name);
            }
          }
          const games = [...gameNames].sort(
            (a, b) => (orderOf.get(a) ?? 0) - (orderOf.get(b) ?? 0),
          );
          const selectedGame =
            requestedGame && gameNames.has(requestedGame)
              ? requestedGame
              : games[games.length - 1];

          const entries: { move: string; method: string; level: number }[] = [];
          for (const move of pokemon.moves) {
            for (const detail of move.version_group_details) {
              if (detail.version_group.name === selectedGame) {
                entries.push({
                  move: move.move.name,
                  method: detail.move_learn_method.name,
                  level: detail.level_learned_at,
                });
              }
            }
          }

          const uniqueMoves = [...new Set(entries.map((e) => e.move))];
          const moves$ = uniqueMoves.length
            ? forkJoin(uniqueMoves.map((n) => api.get<Move>(`move/${n}/`)))
            : of([] as Move[]);

          return moves$.pipe(
            map((moveRecords) => {
              const byName = new Map(moveRecords.map((m) => [m.name, m] as const));
              const byMethod = new Map<string, MoveRow[]>();
              for (const entry of entries) {
                const record = byName.get(entry.move);
                if (!record) continue;
                const row: MoveRow = {
                  level: entry.method === 'level-up' ? entry.level : null,
                  moveName: record.name,
                  moveLabel: englishName(record.names, record.name),
                  typeName: record.type.name,
                  typeLabel: typeLabel(typeNames, record.type.name),
                  category: humanize(record.damage_class.name),
                  power: record.power,
                  accuracy: record.accuracy,
                  pp: record.pp,
                };
                const rows = byMethod.get(entry.method) ?? [];
                rows.push(row);
                byMethod.set(entry.method, rows);
              }
              const methods = [...byMethod.keys()].sort((a, b) => {
                const ia = METHOD_ORDER.indexOf(a);
                const ib = METHOD_ORDER.indexOf(b);
                if (ia !== -1 || ib !== -1) {
                  return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
                }
                return humanize(a).localeCompare(humanize(b));
              });
              const tables: MovesTableData[] = methods.map((method) => {
                const rows = byMethod.get(method)!;
                rows.sort(
                  method === 'level-up'
                    ? (a, b) => (a.level ?? 0) - (b.level ?? 0) || a.moveLabel.localeCompare(b.moveLabel)
                    : (a, b) => a.moveLabel.localeCompare(b.moveLabel),
                );
                return {
                  method,
                  label: humanize(method),
                  hasLevel: method === 'level-up',
                  rows,
                };
              });

              const stats = pokemon.stats.map((s) => ({
                label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
                value: s.base_stat,
              }));
              const abilities = pokemon.abilities
                .slice()
                .sort((a, b) => a.slot - b.slot)
                .map((a) => ({
                  name: a.ability.name,
                  label: humanize(a.ability.name),
                  hidden: a.is_hidden,
                }));

              return {
                englishName: englishName(species.names, species.name),
                id: species.id,
                genus: species.genera.find((g) => g.language.name === 'en')?.genus ?? '',
                types: pokemon.types
                  .slice()
                  .sort((a, b) => a.slot - b.slot)
                  .map((t) => ({ name: t.type.name, label: typeLabel(typeNames, t.type.name) })),
                artwork:
                  pokemon.sprites.other?.['official-artwork']?.front_default ??
                  pokemon.sprites.front_default ??
                  null,
                height: `${(pokemon.height / 10).toFixed(1)} m`,
                weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
                flavor: latestEnglishFlavor(species.flavor_text_entries),
                stats,
                total: stats.reduce((sum, s) => sum + s.value, 0),
                abilities,
                chain: chain.chain,
                games: games.map((g) => ({ name: g, label: humanize(g) })),
                selectedGame,
                tables,
              } satisfies PokemonPageData;
            }),
          );
        }),
      );
    }),
    catchError(() => of(null)),
  );
};

/** Move detail page. */
export const moveResolver: ResolveFn<MovePageData | null> = (route) => {
  const api = inject(PokeApiService);
  const dex = inject(DexService);
  const name = route.paramMap.get('name') ?? '';
  return api.get<Move>(`move/${encodeURIComponent(name)}/`).pipe(
    switchMap((move) =>
      forkJoin({
        typeNames: dex.typeNameMap$,
        learnedBy: dex.pokemonCards(move.learned_by_pokemon),
      }).pipe(
        map(({ typeNames, learnedBy }) => {
          const shortEffect = move.effect_entries.find((e) => e.language.name === 'en')?.short_effect;
          return {
            englishName: englishName(move.names, move.name),
            typeName: move.type.name,
            typeLabel: typeLabel(typeNames, move.type.name),
            category: humanize(move.damage_class.name),
            power: move.power,
            accuracy: move.accuracy,
            pp: move.pp,
            effect: shortEffect
              ? collapseWhitespace(shortEffect)
              : (latestEnglishFlavor(move.flavor_text_entries) ?? '\u2014'),
            learnedBy,
          } satisfies MovePageData;
        }),
      ),
    ),
    catchError(() => of(null)),
  );
};

/** Ability detail page. */
export const abilityResolver: ResolveFn<AbilityPageData | null> = (route) => {
  const api = inject(PokeApiService);
  const dex = inject(DexService);
  const name = route.paramMap.get('name') ?? '';
  return api.get<Ability>(`ability/${encodeURIComponent(name)}/`).pipe(
    switchMap((ability) =>
      dex
        .pokemonCards(ability.pokemon.map((p) => ({ ...p.pokemon, hidden: p.is_hidden })))
        .pipe(
          map((pokemon) => {
            const shortEffect = ability.effect_entries.find(
              (e) => e.language.name === 'en',
            )?.short_effect;
            return {
              englishName: englishName(ability.names, ability.name),
              effect: shortEffect ? collapseWhitespace(shortEffect) : '\u2014',
              pokemon,
            } satisfies AbilityPageData;
          }),
        ),
    ),
    catchError(() => of(null)),
  );
};

/** Type list page. */
export const typesResolver: ResolveFn<TypeInfo[]> = () => {
  const dex = inject(DexService);
  return dex.typeRecords$.pipe(
    map((records) => records.map((t) => ({ name: t.name, label: englishName(t.names, t.name) }))),
  );
};

/** Type detail page. */
export const typeResolver: ResolveFn<TypePageData | null> = (route) => {
  const api = inject(PokeApiService);
  const dex = inject(DexService);
  const name = route.paramMap.get('name') ?? '';
  return api.get<TypeRecord>(`type/${encodeURIComponent(name)}/`).pipe(
    switchMap((type) =>
      forkJoin({
        typeNames: dex.typeNameMap$,
        pokemon: dex.pokemonCards(type.pokemon.map((p) => p.pokemon)),
      }).pipe(
        map(({ typeNames, pokemon }) => ({
          englishName: englishName(type.names, type.name),
          relations: DAMAGE_RELATIONS.map(([key, term]) => ({
            term,
            types: (type.damage_relations[key] ?? []).map((t) => ({
              name: t.name,
              label: typeLabel(typeNames, t.name),
            })),
          })),
          pokemon,
          moves: type.moves
            .map((m) => ({ name: m.name, label: humanize(m.name) }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        })),
      ),
    ),
    catchError(() => of(null)),
  );
};
