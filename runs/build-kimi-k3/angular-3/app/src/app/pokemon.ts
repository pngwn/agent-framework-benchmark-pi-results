import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ResolveFn, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import {
  EvolutionChainRecord,
  EvolutionNode,
  MoveRecord,
  PokeApi,
  PokemonRecord,
  SpeciesRecord,
  VersionGroupRecord,
} from './api';
import { DexData } from './dex-data';
import { MoveGroup, MoveRow, MovesTable } from './moves-table';
import { NotFoundView, applyNotFound } from './not-found';
import {
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavor,
} from './util';
import { CardType } from './pokemon-card';

export interface EvoNodeVM {
  name: string;
  children: EvoNodeVM[];
}

export interface PokemonVM {
  title: string;
  dex: string;
  genus: string | null;
  types: CardType[];
  artwork: string | null;
  height: string;
  weight: string;
  flavor: string | null;
  stats: { label: string; value: number }[];
  total: number;
  abilities: { name: string; label: string; hidden: boolean }[];
  evo: EvoNodeVM[];
  games: { name: string; label: string }[];
  defaultGame: string | null;
  selectedGame: string | null;
  groups: MoveGroup[];
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

/** Learn method order: Level Up, Machine, Egg, Tutor, then the rest alphabetically. */
const FIXED_METHODS = ['level-up', 'machine', 'egg', 'tutor'];

function toEvoVM(node: EvolutionNode): EvoNodeVM {
  return { name: node.species.name, children: (node.evolves_to ?? []).map(toEvoVM) };
}

export const pokemonResolver: ResolveFn<PokemonVM | null> = async (route) => {
  const api = inject(PokeApi);
  const dex = inject(DexData);
  const name = route.paramMap.get('name') ?? '';

  const species = await api
    .get<SpeciesRecord>(`pokemon-species/${encodeURIComponent(name)}`)
    .catch(() => null);
  if (!species) return null;

  const typeNames = await dex.typeNames();
  const varieties = species.varieties?.length
    ? species.varieties
    : [{ is_default: true, pokemon: { name: species.name, url: '' } }];
  const defaultPokemon = (varieties.find((v) => v.is_default) ?? varieties[0]).pokemon.name;

  const [pokemon, chain] = await Promise.all([
    api.get<PokemonRecord>(`pokemon/${defaultPokemon}`).catch(() => null),
    species.evolution_chain?.url
      ? api.getByRefUrl<EvolutionChainRecord>(species.evolution_chain.url).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (!pokemon) return null;

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const versionGroupNames = new Set<string>();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      versionGroupNames.add(detail.version_group.name);
    }
  }
  const versionGroups = (
    await Promise.all(
      [...versionGroupNames].map((vg) =>
        api.get<VersionGroupRecord>(`version-group/${vg}`).catch(() => null),
      ),
    )
  )
    .filter((vg): vg is VersionGroupRecord => vg !== null)
    .sort((a, b) => a.order - b.order);

  const games = versionGroups.map((vg) => ({ name: vg.name, label: humanize(vg.name) }));
  const defaultGame = games.length ? games[games.length - 1].name : null;
  const requestedGame = route.queryParamMap.get('game');
  const selectedGame = games.some((g) => g.name === requestedGame) ? requestedGame : defaultGame;

  // Moves for the selected version group, grouped by learn method.
  const groups: MoveGroup[] = [];
  if (selectedGame) {
    const byMethod = new Map<string, Map<string, number>>();
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group.name !== selectedGame) continue;
        let methodMoves = byMethod.get(detail.move_learn_method.name);
        if (!methodMoves) byMethod.set(detail.move_learn_method.name, (methodMoves = new Map()));
        const existing = methodMoves.get(move.move.name);
        const level = detail.level_learned_at;
        if (existing === undefined || (level > 0 && level < existing) || existing === 0) {
          methodMoves.set(move.move.name, level);
        }
      }
    }

    const moveNames = new Set<string>();
    byMethod.forEach((moves) => moves.forEach((_, moveName) => moveNames.add(moveName)));
    const records = new Map<string, MoveRecord>();
    await Promise.all(
      [...moveNames].map((moveName) =>
        api.get<MoveRecord>(`move/${moveName}`).then(
          (record) => records.set(moveName, record),
          () => undefined,
        ),
      ),
    );

    const methods = [...byMethod.keys()].sort((a, b) => {
      const ia = FIXED_METHODS.indexOf(a);
      const ib = FIXED_METHODS.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? FIXED_METHODS.length : ia) - (ib === -1 ? FIXED_METHODS.length : ib);
      return humanize(a).localeCompare(humanize(b));
    });

    for (const method of methods) {
      const rows: MoveRow[] = [];
      byMethod.get(method)!.forEach((level, moveName) => {
        const record = records.get(moveName);
        if (!record) return;
        rows.push({
          level: method === 'level-up' ? level : null,
          move: record.name,
          moveEn: englishName(record.names) ?? humanize(record.name),
          typeName: record.type?.name ?? '',
          typeEn:
            (record.type && typeNames.get(record.type.name)) ??
            (record.type ? humanize(record.type.name) : '—'),
          category: record.damage_class ? humanize(record.damage_class.name) : '—',
          power: record.power ?? null,
          accuracy: record.accuracy ?? null,
          pp: record.pp ?? null,
        });
      });
      rows.sort((a, b) =>
        method === 'level-up'
          ? (a.level ?? 0) - (b.level ?? 0) || a.moveEn.localeCompare(b.moveEn)
          : a.moveEn.localeCompare(b.moveEn),
      );
      if (rows.length) groups.push({ method, label: humanize(method), rows });
    }
  }

  const stats = (pokemon.stats ?? []).map((entry) => ({
    label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat,
  }));

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  return {
    title: englishName(species.names) ?? humanize(species.name),
    dex: dexNumber(species.id),
    genus: species.genera?.find((g) => g.language?.name === 'en')?.genus ?? null,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.type.name,
        en: typeNames.get(entry.type.name) ?? humanize(entry.type.name),
      })),
    artwork: artwork ? api.absolutize(artwork) : null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    stats,
    total: stats.reduce((sum, stat) => sum + stat.value, 0),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: entry.is_hidden,
      })),
    evo: chain ? [toEvoVM(chain.chain)] : [{ name: species.name, children: [] }],
    games,
    defaultGame,
    selectedGame,
    groups,
  };
};

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, MovesTable, NotFoundView],
  templateUrl: './pokemon.html',
  styleUrl: './pokemon.css',
})
export class PokemonPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly humanize = humanize;

  protected readonly vm = toSignal(
    this.route.data.pipe(map((d) => d['vm'] as PokemonVM | null)),
    { requireSync: true },
  );

  private readonly gameSelect = viewChild<ElementRef<HTMLSelectElement>>('gameSelect');

  constructor() {
    const vm = this.vm();
    const title = inject(Title);
    if (vm) title.setTitle(`${vm.title} – Pokédex`);
    else applyNotFound(title);
    // The game select is uncontrolled: sync it only when the resolved game
    // changes without the user touching the select (e.g. back/forward).
    this.route.data.subscribe(() => {
      const select = this.gameSelect()?.nativeElement;
      const selected = this.vm()?.selectedGame;
      if (select && selected && select.value !== selected) select.value = selected;
    });
  }

  protected barWidth(value: number): number {
    return Math.min(100, (value / 255) * 100);
  }

  protected onGame(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game: value === this.vm()?.defaultGame ? null : value },
      queryParamsHandling: 'merge',
    });
  }
}
