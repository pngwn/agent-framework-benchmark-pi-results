import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { ApiService } from '../core/api.service';
import {
  displayValue,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '../core/format';
import type {
  EvolutionChain,
  Move,
  MoveVersionGroupDetail,
  Pokemon,
  PokemonMove,
  Species,
  VersionGroup,
} from '../core/models';
import { NotFoundComponent } from '../shared/not-found';

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDirection = 'ascending' | 'descending';

interface MoveColumn {
  key: SortKey;
  label: string;
}

interface MoveRow {
  level: number;
  moveName: string;
  moveDisplayName: string;
  typeName: string;
  typeDisplayName: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveTable {
  method: string;
  title: string;
  columns: MoveColumn[];
  rows: MoveRow[];
}

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface StatRow {
  label: string;
  value: number;
  width: number;
}

const MOVE_COLUMNS: MoveColumn[] = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

const METHOD_PRIORITY = ['level-up', 'machine', 'egg', 'tutor'];

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

function defaultVariety(species: Species): string {
  return (
    species.varieties.find((variety) => variety.is_default)?.pokemon.name ??
    species.varieties[0]?.pokemon.name ??
    species.name
  );
}

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, direction: SortDirection): number {
  const factor = direction === 'ascending' ? 1 : -1;

  if (key === 'power' || key === 'accuracy' || key === 'pp') {
    const left = a[key];
    const right = b[key];
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return (left - right) * factor;
  }

  if (key === 'level') {
    return (a.level - b.level) * factor;
  }

  const left = key === 'move' ? a.moveDisplayName : key === 'type' ? a.typeDisplayName : a.category;
  const right = key === 'move' ? b.moveDisplayName : key === 'type' ? b.typeDisplayName : b.category;
  return left.localeCompare(right) * factor;
}

function sortRows(rows: MoveRow[], sort: SortState): MoveRow[] {
  return [...rows].sort((a, b) => compareRows(a, b, sort.key, sort.direction));
}

function buildTables(
  entries: { move: PokemonMove; detail: MoveVersionGroupDetail }[],
  moves: Map<string, Move>,
): MoveTable[] {
  const rowsByMethod = new Map<string, MoveRow[]>();

  for (const entry of entries) {
    const move = moves.get(entry.move.move.name);
    if (!move) continue;
    const method = entry.detail.move_learn_method.name;
    const row: MoveRow = {
      level: entry.detail.level_learned_at,
      moveName: move.name,
      moveDisplayName: englishName(move.names, move.name),
      typeName: move.type.name,
      typeDisplayName: humanize(move.type.name),
      category: humanize(move.damage_class.name),
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
    const rows = rowsByMethod.get(method) ?? [];
    rows.push(row);
    rowsByMethod.set(method, rows);
  }

  return [...rowsByMethod.entries()]
    .filter(([, rows]) => rows.length > 0)
    .map(([method, rows]) => {
      const sorted = [...rows].sort((a, b) =>
        method === 'level-up'
          ? a.level - b.level || a.moveDisplayName.localeCompare(b.moveDisplayName)
          : a.moveDisplayName.localeCompare(b.moveDisplayName),
      );
      return {
        method,
        title: humanize(method),
        columns:
          method === 'level-up'
            ? MOVE_COLUMNS
            : MOVE_COLUMNS.filter((column) => column.key !== 'level'),
        rows: sorted,
      };
    })
    .sort((a, b) => {
      const left = METHOD_PRIORITY.indexOf(a.method);
      const right = METHOD_PRIORITY.indexOf(b.method);
      if (left !== -1 || right !== -1) {
        return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
      }
      return a.title.localeCompare(b.title);
    });
}

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, NotFoundComponent],
  templateUrl: './pokemon-page.html',
  styleUrl: './pokemon-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly router = inject(Router);

  private readonly species$ = this.route.paramMap.pipe(
    map((params) => params.get('name') ?? ''),
    switchMap((name) =>
      name ? this.api.optional<Species>(`/pokemon-species/${name}/`) : of(null),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private readonly pokemon$ = this.species$.pipe(
    switchMap((species) =>
      species ? this.api.optional<Pokemon>(`/pokemon/${defaultVariety(species)}/`) : of(null),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  protected readonly species = toSignal(this.species$);
  protected readonly pokemon = toSignal(this.pokemon$);
  protected readonly evolution = toSignal(
    this.species$.pipe(
      switchMap((species) =>
        species?.evolution_chain
          ? this.api.optional<EvolutionChain>(this.api.pathOf(species.evolution_chain.url))
          : of(null),
      ),
    ),
  );

  private readonly versionGroups$ = this.pokemon$.pipe(
    switchMap((pokemon) => {
      if (!pokemon) return of([] as VersionGroup[]);
      const names = new Set<string>();
      for (const move of pokemon.moves) {
        for (const detail of move.version_group_details) {
          names.add(detail.version_group.name);
        }
      }
      if (names.size === 0) return of([] as VersionGroup[]);
      return forkJoin(
        [...names].map((name) =>
          this.api.optional<VersionGroup>(`/version-group/${name}/`),
        ),
      ).pipe(
        map((groups) =>
          groups
            .filter((group): group is VersionGroup => group !== null)
            .sort((a, b) => a.order - b.order),
        ),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  protected readonly versionGroups = toSignal(this.versionGroups$, {
    initialValue: [] as VersionGroup[],
  });

  private readonly gameQuery$ = this.route.queryParamMap.pipe(
    map((params) => params.get('game')),
    distinctUntilChanged(),
  );

  private readonly selectedGame$ = combineLatest([
    this.versionGroups$,
    this.gameQuery$,
  ]).pipe(
    map(([groups, requested]) => {
      const matched = requested
        ? groups.find((group) => group.name === requested)
        : undefined;
      return matched ?? groups[groups.length - 1] ?? null;
    }),
    distinctUntilChanged(
      (previous, current) => previous?.name === current?.name,
    ),
  );

  protected readonly selectedGame = toSignal(this.selectedGame$);

  private readonly tables$ = combineLatest([
    this.pokemon$,
    this.selectedGame$,
  ]).pipe(
    switchMap(([pokemon, game]) => {
      if (!pokemon || !game) return of([] as MoveTable[]);
      const entries: { move: PokemonMove; detail: MoveVersionGroupDetail }[] = [];
      for (const move of pokemon.moves) {
        for (const detail of move.version_group_details) {
          if (detail.version_group.name === game.name) entries.push({ move, detail });
        }
      }
      if (entries.length === 0) return of([] as MoveTable[]);
      const moveNames = [...new Set(entries.map((entry) => entry.move.move.name))];
      return forkJoin(
        moveNames.map((name) => this.api.optional<Move>(`/move/${name}/`)),
      ).pipe(
        map((moves) => {
          const byName = new Map<string, Move>();
          for (const move of moves) {
            if (move) byName.set(move.name, move);
          }
          return buildTables(entries, byName);
        }),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private readonly baseTables = toSignal(this.tables$);

  protected readonly sortState = signal<Record<string, SortState>>({});

  protected readonly tables = computed(() => {
    const base = this.baseTables();
    if (!base) return null;
    const state = this.sortState();
    return base.map((table) => {
      const sort = state[table.method];
      return sort ? { ...table, rows: sortRows(table.rows, sort) } : table;
    });
  });

  protected readonly displayName = computed(() => {
    const species = this.species();
    return species ? englishName(species.names, species.name) : 'Not found';
  });

  protected readonly genus = computed(() => {
    const species = this.species();
    return (
      species?.genera.find((entry) => entry.language.name === 'en')?.genus ?? ''
    );
  });

  protected readonly flavorText = computed(() =>
    latestEnglishFlavor(this.species()?.flavor_text_entries),
  );

  protected readonly artworkUrl = computed(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return '';
    return this.api.mediaUrl(
      pokemon.sprites.other?.['official-artwork']?.front_default ??
        pokemon.sprites.front_default,
    );
  });

  protected readonly stats = computed<StatRow[]>(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return [];
    return pokemon.stats.map((stat) => {
      const value = stat.base_stat;
      return {
        label: STAT_LABELS[stat.stat.name] ?? humanize(stat.stat.name),
        value,
        width: Math.min(100, (value / 255) * 100),
      };
    });
  });

  protected readonly statTotal = computed(() =>
    this.stats().reduce((total, stat) => total + stat.value, 0),
  );

  constructor() {
    effect(() => {
      const species = this.species();
      if (species === undefined) return;
      this.title.setTitle(
        species ? `${this.displayName()} – Pokédex` : 'Not found – Pokédex',
      );
    });

    effect(() => {
      const tables = this.tables();
      if (tables === null || typeof window === 'undefined') return;
      if (window.location.hash === '#moves') {
        setTimeout(() => {
          document.getElementById('moves')?.scrollIntoView({ block: 'start' });
        });
      }
    });
  }

  protected dexNumber(): string {
    const species = this.species();
    return species ? `#${String(species.id).padStart(4, '0')}` : '';
  }

  protected typeLabel(name: string): string {
    return humanize(name);
  }

  protected format(value: number | null): string {
    return displayValue(value);
  }

  protected heightText(): string {
    const pokemon = this.pokemon();
    return pokemon ? `${(pokemon.height / 10).toFixed(1)} m` : '';
  }

  protected weightText(): string {
    const pokemon = this.pokemon();
    return pokemon ? `${(pokemon.weight / 10).toFixed(1)} kg` : '';
  }

  protected artworkAlt(): string {
    return this.displayName();
  }

  protected sortFor(method: string, key: SortKey): SortDirection | null {
    const sort = this.sortState()[method];
    return sort?.key === key ? sort.direction : null;
  }

  protected toggleSort(method: string, key: SortKey): void {
    const current = this.sortState()[method];
    const direction: SortDirection =
      current?.key === key && current.direction === 'ascending'
        ? 'descending'
        : 'ascending';
    this.sortState.update((state) => ({
      ...state,
      [method]: { key, direction },
    }));
  }

  protected nodeLabel(name: string): string {
    return humanize(name);
  }

  protected onGameChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game: value || null },
      queryParamsHandling: 'merge',
      fragment: this.route.snapshot.fragment ?? undefined,
      replaceUrl: true,
    });
  }
}
