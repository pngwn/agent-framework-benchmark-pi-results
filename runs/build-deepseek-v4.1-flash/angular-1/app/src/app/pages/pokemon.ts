import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { NgTemplateOutlet } from '@angular/common';
import {
  EvolutionChainRecord,
  EvolutionNode,
  MoveRecord,
  PokeApi,
  PokemonRecord,
  SpeciesRecord,
  VersionGroupRecord,
} from '../core/pokeapi';
import {
  compareText,
  dexNumber,
  englishName,
  humanize,
  idFromUrl,
  kilograms,
  latestFlavorText,
  metres,
  numberOrDash,
} from '../core/util';
import { NotFoundContent } from '../shared/not-found-content';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const STAT_MAX = 180;

interface StatVM {
  key: string;
  label: string;
  value: number;
  width: number;
}

interface AbilityVM {
  name: string;
  label: string;
  hidden: boolean;
}

interface TypeVM {
  name: string;
  label: string;
}

interface MoveRowVM {
  level: number;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface ColumnVM {
  key: string;
  label: string;
}

interface MoveTableVM {
  method: string;
  label: string;
  columns: ColumnVM[];
  rows: MoveRowVM[];
  sortedRows: MoveRowVM[];
  sortKey: string;
  sortDir: 'ascending' | 'descending';
}

interface PokemonBaseVM {
  species: SpeciesRecord;
  pokemon: PokemonRecord;
  name: string;
  dex: string;
  genus: string;
  flavorText: string;
  artwork: string | null;
  types: TypeVM[];
  height: string;
  weight: string;
  stats: StatVM[];
  statTotal: number;
  abilities: AbilityVM[];
  evolutionRoot: EvolutionNode | null;
  versionGroups: VersionGroupRecord[];
}

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, NotFoundContent],
  template: `
    @if (notFound()) {
      <app-not-found-content />
    } @else if (base()) {
      @if (base(); as data) {
      <main class="page">
        <div class="pokemon-summary">
          <div class="artwork-box">
            @if (data.artwork) {
              <img class="artwork" [src]="data.artwork" [alt]="data.name" />
            }
          </div>
          <div class="summary-details">
            <div class="dex-number">{{ data.dex }}</div>
            <h1>{{ data.name }}</h1>
            <p class="genus">{{ data.genus }}</p>
            <div class="type-badges">
              @for (type of data.types; track type.name) {
                <a
                  class="type-badge type-link"
                  [attr.data-type]="type.name"
                  [routerLink]="['/types', type.name]"
                  >{{ type.label }}</a
                >
              }
            </div>
            <dl class="measurements">
              <div>
                <dt>Height</dt>
                <dd>{{ data.height }}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{{ data.weight }}</dd>
              </div>
            </dl>
            <p class="flavor-text">{{ data.flavorText }}</p>
          </div>
        </div>

        <section class="panel" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Base stats</h2>
          <table class="stats-table">
            <tbody>
              @for (stat of data.stats; track stat.key) {
                <tr>
                  <th scope="row">{{ stat.label }}</th>
                  <td class="stat-value">{{ stat.value }}</td>
                  <td class="stat-bar-cell">
                    <div class="stat-track"><div class="stat-fill" [style.width.%]="stat.width"></div></div>
                  </td>
                </tr>
              }
              <tr class="stat-total">
                <th scope="row">Total</th>
                <td class="stat-value">{{ data.statTotal }}</td>
                <td class="stat-bar-cell"></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading">Abilities</h2>
          <ul class="plain-list">
            @for (ability of data.abilities; track ability.name) {
              <li>
                <a [routerLink]="['/abilities', ability.name]">{{ ability.label }}</a>
                @if (ability.hidden) {
                  <span class="hidden-mark"> (hidden)</span>
                }
              </li>
            }
          </ul>
        </section>

        <section class="panel" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          @if (data.evolutionRoot) {
            <ul class="evolution-tree">
              <ng-container
                *ngTemplateOutlet="evolutionNode; context: { $implicit: data.evolutionRoot }"
              ></ng-container>
            </ul>
          }
        </section>

        <section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>

          <div class="game-field">
            <label for="game-select">Game</label>
            <select id="game-select" [value]="selectedGame()" (change)="onGameChange($event)">
              @for (group of data.versionGroups; track group.name) {
                <option [value]="group.name" [selected]="selectedGame() === group.name">{{
                  humanize(group.name)
                }}</option>
              }
            </select>
          </div>

          @for (table of moveTables(); track table.method) {
            <table class="moves-table">
              <caption>{{ table.label }}</caption>
              <thead>
                <tr>
                  @for (column of table.columns; track column.key) {
                    <th
                      scope="col"
                      [attr.aria-sort]="table.sortKey === column.key ? table.sortDir : null"
                      (click)="sortTable(table, column.key)"
                    >
                      <button
                        type="button"
                        class="sort-button"
                        (click)="sortTable(table, column.key); $event.stopPropagation()"
                      >
                        {{ column.label }}
                        @if (table.sortKey === column.key) {
                          <span aria-hidden="true">{{ table.sortDir === 'ascending' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of table.sortedRows; track $index) {
                  <tr>
                    @if (table.method === 'level-up') {
                      <td>{{ row.level }}</td>
                    }
                    <td>
                      <a [routerLink]="['/moves', row.moveName]">{{ row.moveLabel }}</a>
                    </td>
                    <td>
                      <a
                        class="type-badge type-link"
                        [attr.data-type]="row.typeName"
                        [routerLink]="['/types', row.typeName]"
                        >{{ row.typeLabel }}</a
                      >
                    </td>
                    <td>{{ row.category }}</td>
                    <td>{{ dash(row.power) }}</td>
                    <td>{{ dash(row.accuracy) }}</td>
                    <td>{{ dash(row.pp) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      </main>
      }
    } @else {
      <main class="page"><p class="loading">Loading…</p></main>
    }

    <ng-template #evolutionNode let-node>
      <li>
        <a [routerLink]="['/pokemon', node.species.name]">{{ humanize(node.species.name) }}</a>
        @if (node.evolves_to.length > 0) {
          <ul>
            @for (child of node.evolves_to; track child.species.name) {
              <ng-container *ngTemplateOutlet="evolutionNode; context: { $implicit: child }"></ng-container>
            }
          </ul>
        }
      </li>
    </ng-template>
  `,
})
export class PokemonPage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  protected readonly humanize = humanize;
  protected readonly dash = numberOrDash;

  protected readonly notFound = signal(false);
  protected readonly base = signal<PokemonBaseVM | null>(null);
  protected readonly moveTables = signal<MoveTableVM[]>([]);
  protected readonly selectedGame = signal('');
  private readonly gameParam = signal<string | null>(null);

  private loadRequest = 0;
  private movesRequest = 0;

  constructor() {
    this.gameParam.set(this.route.snapshot.queryParamMap.get('game'));

    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (name) void this.load(name);
    });

    this.route.queryParamMap.subscribe((params) => {
      this.gameParam.set(params.get('game'));
    });

    effect(() => {
      const base = this.base();
      const requestedGame = this.gameParam();
      if (base) void this.loadMoveTables(base, requestedGame);
    });
  }

  private async load(name: string): Promise<void> {
    const request = ++this.loadRequest;
    this.notFound.set(false);
    this.base.set(null);
    this.moveTables.set([]);

    try {
      const species = await this.api.getSpecies(name);
      const pokemon = await this.api.getPokemon(species.id);
      const evolutionRoot = await this.loadEvolution(species);
      const versionGroups = await this.loadVersionGroups(pokemon);

      if (request !== this.loadRequest) return;

      const displayName = englishName(species.names, species.name);
      const genus =
        species.genera.find((entry) => entry.language.name === 'en')?.genus ?? '';
      const stats = pokemon.stats.map((stat) => ({
        key: stat.stat.name,
        label: STAT_LABELS[stat.stat.name] ?? humanize(stat.stat.name),
        value: stat.base_stat,
        width: Math.min(100, (stat.base_stat / STAT_MAX) * 100),
      }));
      const statTotal = stats.reduce((sum, stat) => sum + stat.value, 0);

      this.base.set({
        species,
        pokemon,
        name: displayName,
        dex: dexNumber(species.id),
        genus,
        flavorText: latestFlavorText(species.flavor_text_entries) ?? '—',
        artwork: this.api.artworkUrl(pokemon),
        types: [...pokemon.types]
          .sort((a, b) => a.slot - b.slot)
          .map((slot) => ({ name: slot.type.name, label: humanize(slot.type.name) })),
        height: metres(pokemon.height),
        weight: kilograms(pokemon.weight),
        stats,
        statTotal,
        abilities: [...pokemon.abilities]
          .sort((a, b) => a.slot - b.slot)
          .map((slot) => ({
            name: slot.ability.name,
            label: humanize(slot.ability.name),
            hidden: slot.is_hidden,
          })),
        evolutionRoot,
        versionGroups,
      });

      this.title.setTitle(`${displayName} – Pokédex`);
      this.scheduleMovesScroll();
    } catch {
      if (request !== this.loadRequest) return;
      this.notFound.set(true);
      this.title.setTitle('Not found – Pokédex');
    }
  }

  private async loadEvolution(species: SpeciesRecord): Promise<EvolutionNode | null> {
    if (!species.evolution_chain) return null;
    try {
      const id = idFromUrl(species.evolution_chain.url);
      const chain: EvolutionChainRecord = await this.api.getEvolutionChain(
        id ?? species.evolution_chain.url,
      );
      return chain.chain;
    } catch {
      return null;
    }
  }

  private async loadVersionGroups(pokemon: PokemonRecord): Promise<VersionGroupRecord[]> {
    const names = new Set<string>();
    for (const move of pokemon.moves) {
      for (const detail of move.version_group_details) {
        names.add(detail.version_group.name);
      }
    }
    const groups = await Promise.all(
      [...names].map((name) =>
        this.api.getVersionGroup(name).catch(() => null as VersionGroupRecord | null),
      ),
    );
    return groups
      .filter((group): group is VersionGroupRecord => group !== null)
      .sort((a, b) => a.order - b.order);
  }

  private async loadMoveTables(
    base: PokemonBaseVM,
    requestedGame: string | null,
  ): Promise<void> {
    const request = ++this.movesRequest;
    if (base.versionGroups.length === 0) {
      this.moveTables.set([]);
      this.selectedGame.set('');
      return;
    }

    const requested = base.versionGroups.find((group) => group.name === requestedGame);
    const selected =
      requested ??
      [...base.versionGroups].sort((a, b) => b.order - a.order)[0];
    this.selectedGame.set(selected.name);

    const details: {
      moveName: string;
      method: string;
      level: number;
    }[] = [];
    for (const move of base.pokemon.moves) {
      for (const detail of move.version_group_details) {
        if (detail.version_group.name === selected.name) {
          details.push({
            moveName: move.move.name,
            method: detail.move_learn_method.name,
            level: detail.level_learned_at,
          });
        }
      }
    }

    if (details.length === 0) {
      this.moveTables.set([]);
      return;
    }

    const uniqueMoveNames = [...new Set(details.map((detail) => detail.moveName))];
    const moveResults = await Promise.all(
      uniqueMoveNames.map((name) =>
        this.api.getMove(name).catch(() => null as MoveRecord | null),
      ),
    );
    if (request !== this.movesRequest) return;

    const moveByName = new Map<string, MoveRecord>();
    for (const move of moveResults) {
      if (move) moveByName.set(move.name, move);
    }

    const grouped = new Map<string, MoveRowVM[]>();
    for (const detail of details) {
      const move = moveByName.get(detail.moveName);
      if (!move) continue;
      const row: MoveRowVM = {
        level: detail.level,
        moveName: move.name,
        moveLabel: englishName(move.names, move.name),
        typeName: move.type.name,
        typeLabel: humanize(move.type.name),
        category: humanize(move.damage_class.name),
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      };
      const rows = grouped.get(detail.method);
      if (rows) rows.push(row);
      else grouped.set(detail.method, [row]);
    }

    const methodOrder = ['level-up', 'machine', 'egg', 'tutor'];
    const methods = [...grouped.keys()].sort((a, b) => {
      const ai = methodOrder.indexOf(a);
      const bi = methodOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return compareText(humanize(a), humanize(b));
    });

    const allColumns: ColumnVM[] = [
      { key: 'level', label: 'Level' },
      { key: 'move', label: 'Move' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'power', label: 'Power' },
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'pp', label: 'PP' },
    ];

    const tables: MoveTableVM[] = methods.map((method) => {
      const rows = grouped.get(method) ?? [];
      const columns = method === 'level-up' ? allColumns : allColumns.filter((column) => column.key !== 'level');
      const sortKey = method === 'level-up' ? 'level' : 'move';
      return {
        method,
        label: humanize(method),
        columns,
        rows,
        sortedRows: this.sortRows(rows, sortKey, 'ascending'),
        sortKey,
        sortDir: 'ascending',
      };
    });

    if (request === this.movesRequest) {
      this.moveTables.set(tables);
      this.scheduleMovesScroll();
    }
  }

  protected onGameChange(event: Event): void {
    const game = (event.target as HTMLSelectElement).value;
    this.gameParam.set(game);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game },
      queryParamsHandling: 'merge',
      fragment: this.route.snapshot.fragment ?? undefined,
    });
  }

  protected sortTable(table: MoveTableVM, key: string): void {
    const sortDir: 'ascending' | 'descending' =
      table.sortKey === key && table.sortDir === 'ascending' ? 'descending' : 'ascending';
    const updated: MoveTableVM = {
      ...table,
      sortKey: key,
      sortDir,
      sortedRows: this.sortRows(table.rows, key, sortDir),
    };
    this.moveTables.update((tables) =>
      tables.map((candidate) => (candidate.method === table.method ? updated : candidate)),
    );
  }

  private sortRows(
    rows: MoveRowVM[],
    key: string,
    direction: 'ascending' | 'descending',
  ): MoveRowVM[] {
    const sign = direction === 'ascending' ? 1 : -1;
    const numericKeys = ['level', 'power', 'accuracy', 'pp'];

    return [...rows].sort((a, b) => {
      const aValue = this.sortValue(a, key);
      const bValue = this.sortValue(b, key);

      if (numericKeys.includes(key)) {
        const aMissing = aValue === null || aValue === undefined;
        const bMissing = bValue === null || bValue === undefined;
        if (aMissing && bMissing) return compareText(a.moveLabel, b.moveLabel);
        if (aMissing) return 1;
        if (bMissing) return -1;
        const difference = Number(aValue) - Number(bValue);
        if (difference !== 0) return difference * sign;
      } else {
        const comparison = compareText(String(aValue ?? ''), String(bValue ?? ''));
        if (comparison !== 0) return comparison * sign;
      }

      return compareText(a.moveLabel, b.moveLabel);
    });
  }

  private sortValue(row: MoveRowVM, key: string): string | number | null {
    switch (key) {
      case 'level':
        return row.level;
      case 'move':
        return row.moveLabel;
      case 'type':
        return row.typeLabel;
      case 'category':
        return row.category;
      case 'power':
        return row.power;
      case 'accuracy':
        return row.accuracy;
      case 'pp':
        return row.pp;
      default:
        return null;
    }
  }

  private scheduleMovesScroll(): void {
    if (this.route.snapshot.fragment !== 'moves') return;
    setTimeout(() => {
      document.getElementById('moves')?.scrollIntoView({ block: 'start' });
    }, 100);
  }
}
