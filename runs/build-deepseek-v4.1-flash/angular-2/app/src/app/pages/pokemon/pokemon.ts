import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { NgTemplateOutlet } from '@angular/common';
import { ApiError, PokeApi } from '../../core/poke-api';
import { EvolutionChain, Move, Pokemon, PokemonSpecies, VersionGroup } from '../../core/models';
import {
  damageClassLabel,
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavor,
  statLabel,
} from '../../core/format';
import { NotFoundContent } from '../../shared/not-found-content';

type SortColumn = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDirection = 'ascending' | 'descending';

interface MoveRow {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  categoryLabel: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveTable {
  methodName: string;
  methodLabel: string;
  rows: MoveRow[];
  sortColumn: SortColumn | null;
  sortDirection: 'ascending' | 'descending';
}

interface StatRow {
  label: string;
  value: number;
  width: string;
}

interface TypeDisplay {
  name: string;
  label: string;
}

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, NotFoundContent],
  templateUrl: './pokemon.html',
  styleUrl: './pokemon.css',
})
export class PokemonPage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly species = signal<PokemonSpecies | null>(null);
  readonly pokemon = signal<Pokemon | null>(null);
  readonly evolution = signal<EvolutionChain | null>(null);
  readonly versionGroups = signal<VersionGroup[]>([]);
  readonly selectedGame = signal<string | null>(this.route.snapshot.queryParamMap.get('game'));
  readonly tables = signal<MoveTable[]>([]);
  readonly notFound = signal(false);

  private typeLabels = new Map<string, string>();
  private buildToken = 0;
  private didScrollToMoves = false;
  private readonly sortState = new Map<string, { column: SortColumn; direction: SortDirection }>();

  readonly displayName = computed(() => {
    const species = this.species();
    return species ? englishName(species.names, species.name) : '';
  });

  readonly dex = computed(() => {
    const species = this.species();
    return species ? dexNumber(species.id) : '';
  });

  readonly genus = computed(() => {
    const species = this.species();
    return species?.genera.find((entry) => entry.language?.name === 'en')?.genus ?? '';
  });

  readonly artwork = computed(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return '';
    return this.api.mediaUrl(
      pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default,
    );
  });

  readonly types = computed<TypeDisplay[]>(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return [];
    return [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.type.name,
        label: this.typeLabel(entry.type.name),
      }));
  });

  readonly height = computed(() => {
    const pokemon = this.pokemon();
    return pokemon ? `${(pokemon.height / 10).toFixed(1)} m` : '';
  });

  readonly weight = computed(() => {
    const pokemon = this.pokemon();
    return pokemon ? `${(pokemon.weight / 10).toFixed(1)} kg` : '';
  });

  readonly flavorText = computed(() => latestEnglishFlavor(this.species()?.flavor_text_entries));

  readonly stats = computed<StatRow[]>(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return [];
    return pokemon.stats.map((stat) => ({
      label: statLabel(stat.stat.name),
      value: stat.base_stat,
      width: `${Math.min(100, (stat.base_stat / 255) * 100)}%`,
    }));
  });

  readonly statTotal = computed(() => this.stats().reduce((sum, stat) => sum + stat.value, 0));

  readonly totalBarWidth = computed(() => `${Math.min(100, (this.statTotal() / 255) * 100)}%`);

  readonly abilities = computed(() => {
    const pokemon = this.pokemon();
    if (!pokemon) return [];
    return [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  });

  readonly chain = computed(() => this.evolution()?.chain ?? null);

  readonly gameOptions = computed(() => {
    const pokemon = this.pokemon();
    const groups = this.versionGroups();
    if (!pokemon || !groups.length) return [];
    const available = new Set<string>();
    for (const move of pokemon.moves) {
      for (const detail of move.version_group_details) {
        available.add(detail.version_group.name);
      }
    }
    return groups.filter((group) => available.has(group.name));
  });

  readonly activeGame = computed<VersionGroup | null>(() => {
    const options = this.gameOptions();
    if (!options.length) return null;
    const selected = this.selectedGame();
    return options.find((option) => option.name === selected) ?? options[options.length - 1];
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (!name) {
        this.markNotFound();
        return;
      }
      this.load(name);
    });

    this.route.queryParamMap.subscribe((params) => {
      this.selectedGame.set(params.get('game'));
    });

    effect(() => {
      const pokemon = this.pokemon();
      const game = this.activeGame();
      if (!pokemon || !game) return;
      void this.buildTables(pokemon, game.name);
    });
  }

  typeLabel(name: string): string {
    return this.typeLabels.get(name) ?? humanize(name);
  }

  isLevelUp(table: MoveTable): boolean {
    return table.methodName === 'level-up';
  }

  ariaSort(table: MoveTable, column: SortColumn): SortDirection | null {
    return table.sortColumn === column ? table.sortDirection : null;
  }

  sortTable(table: MoveTable, column: SortColumn): void {
    const direction: SortDirection =
      table.sortColumn === column && table.sortDirection === 'ascending' ? 'descending' : 'ascending';
    this.sortState.set(table.methodName, { column, direction });
    this.tables.update((tables) =>
      tables.map((entry) =>
        entry.methodName === table.methodName
          ? {
              ...entry,
              sortColumn: column,
              sortDirection: direction,
              rows: this.sortRows(entry.rows, column, direction),
            }
          : entry,
      ),
    );
  }

  onGameChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game: value },
      queryParamsHandling: 'merge',
    });
  }

  extraValue(value: number | null): string {
    return value === null || value === undefined ? '—' : String(value);
  }

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.species.set(null);
    this.pokemon.set(null);
    this.evolution.set(null);
    this.tables.set([]);
    this.buildToken++;
    this.didScrollToMoves = false;
    this.sortState.clear();

    try {
      const species = await this.api.species(name);
      const variety = species.varieties.find((entry) => entry.is_default) ?? species.varieties[0];
      const [pokemon, evolution, versionGroups, typeInfo] = await Promise.all([
        variety ? this.api.pokemon(variety.pokemon.name) : this.api.pokemon(species.id),
        this.api.evolutionChain(species.evolution_chain.url),
        this.api.versionGroups(),
        this.api.typeInfo(),
      ]);

      this.typeLabels = new Map(typeInfo.map((type) => [type.name, type.label]));
      this.evolution.set(evolution);
      this.versionGroups.set(versionGroups);
      this.species.set(species);
      this.pokemon.set(pokemon);
      this.title.setTitle(`${englishName(species.names, species.name)} – Pokédex`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) this.markNotFound();
      else throw error;
    }
  }

  private async buildTables(pokemon: Pokemon, gameName: string): Promise<void> {
    const token = ++this.buildToken;
    const entries: { moveName: string; level: number | null; method: string }[] = [];
    for (const moveEntry of pokemon.moves) {
      for (const detail of moveEntry.version_group_details) {
        if (detail.version_group.name !== gameName) continue;
        entries.push({
          moveName: moveEntry.move.name,
          level: detail.level_learned_at,
          method: detail.move_learn_method.name,
        });
      }
    }

    if (!entries.length) {
      this.tables.set([]);
      return;
    }

    const uniqueMoves = [...new Set(entries.map((entry) => entry.moveName))];
    const moveDetails = await Promise.all(
      uniqueMoves.map((name) => this.api.move(name).catch(() => null)),
    );
    if (token !== this.buildToken) return;

    const moves = new Map<string, Move>();
    for (const move of moveDetails) {
      if (move) moves.set(move.name, move);
    }

    const grouped = new Map<string, MoveRow[]>();
    for (const entry of entries) {
      const move = moves.get(entry.moveName);
      if (!move) continue;
      const row: MoveRow = {
        level: entry.level,
        moveName: move.name,
        moveLabel: englishName(move.names, move.name),
        typeName: move.type.name,
        typeLabel: this.typeLabel(move.type.name),
        categoryLabel: damageClassLabel(move.damage_class.name),
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      };
      const rows = grouped.get(entry.method) ?? [];
      rows.push(row);
      grouped.set(entry.method, rows);
    }

    const rank = (method: string): number => {
      const order = ['level-up', 'machine', 'egg', 'tutor'];
      const index = order.indexOf(method);
      return index === -1 ? order.length : index;
    };

    const tables: MoveTable[] = [...grouped.entries()]
      .map(([methodName, rows]) => {
        const methodLabel = humanize(methodName);
        const defaultRows = [...rows].sort((a, b) => {
          if (methodName === 'level-up') {
            const levelCompare = (a.level ?? 0) - (b.level ?? 0);
            if (levelCompare !== 0) return levelCompare;
          }
          return a.moveLabel.localeCompare(b.moveLabel);
        });
        const persistedSort = this.sortState.get(methodName);
        return {
          methodName,
          methodLabel,
          rows: persistedSort
            ? this.sortRows(defaultRows, persistedSort.column, persistedSort.direction)
            : defaultRows,
          sortColumn: persistedSort?.column ?? null,
          sortDirection: persistedSort?.direction ?? ('ascending' as const),
        };
      })
      .sort((a, b) => {
        const rankCompare = rank(a.methodName) - rank(b.methodName);
        if (rankCompare !== 0) return rankCompare;
        return a.methodLabel.localeCompare(b.methodLabel);
      });

    this.tables.set(tables);
    this.scrollToMovesIfNeeded();
  }

  private sortRows(rows: MoveRow[], column: SortColumn, direction: SortDirection): MoveRow[] {
    const value = (row: MoveRow): string | number | null => {
      switch (column) {
        case 'level':
          return row.level;
        case 'move':
          return row.moveLabel;
        case 'type':
          return row.typeLabel;
        case 'category':
          return row.categoryLabel;
        case 'power':
          return row.power;
        case 'accuracy':
          return row.accuracy;
        case 'pp':
          return row.pp;
      }
    };

    return [...rows].sort((a, b) => {
      const aValue = value(a);
      const bValue = value(b);
      const aMissing = aValue === null || aValue === undefined;
      const bMissing = bValue === null || bValue === undefined;

      let result: number;
      if (aMissing && bMissing) {
        return a.moveLabel.localeCompare(b.moveLabel);
      } else if (aMissing) {
        return 1;
      } else if (bMissing) {
        return -1;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }

      if (result !== 0) return direction === 'ascending' ? result : -result;
      return a.moveLabel.localeCompare(b.moveLabel);
    });
  }

  private scrollToMovesIfNeeded(): void {
    if (this.didScrollToMoves) return;
    if (this.route.snapshot.fragment !== 'moves') return;
    this.didScrollToMoves = true;
    setTimeout(() => {
      document.getElementById('moves')?.scrollIntoView({ block: 'start' });
    }, 0);
  }

  private markNotFound(): void {
    this.notFound.set(true);
    this.title.setTitle('Not found – Pokédex');
  }
}
