import { Component, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { MovesTableData, MoveRow, PokemonPageData } from './resolvers';
import { NotFoundView } from './not-found-view';
import { routeDataSignal } from './route-data';
import { dexNumber, humanize, pageTitle } from './utils';

interface Column {
  key: string;
  label: string;
  numeric?: boolean;
  field: keyof MoveRow;
}

const COLUMNS: Column[] = [
  { key: 'level', label: 'Level', field: 'level' },
  { key: 'move', label: 'Move', field: 'moveLabel' },
  { key: 'type', label: 'Type', field: 'typeLabel' },
  { key: 'category', label: 'Category', field: 'category' },
  { key: 'power', label: 'Power', numeric: true, field: 'power' },
  { key: 'accuracy', label: 'Accuracy', numeric: true, field: 'accuracy' },
  { key: 'pp', label: 'PP', numeric: true, field: 'pp' },
];

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, NotFoundView],
  template: `
    @if (data(); as d) {
      <div class="summary">
        <div class="artwork panel">
          @if (d.artwork) {
            <img [src]="d.artwork" [alt]="d.englishName" width="288" height="288" />
          }
        </div>
        <div class="summary-info">
          <p class="dex">{{ dexNumber(d.id) }}</p>
          <h1>{{ d.englishName }}</h1>
          <p class="genus">{{ d.genus }}</p>
          <p class="badges">
            @for (type of d.types; track type.name) {
              <a class="badge type-{{ type.name }}" [routerLink]="['/types', type.name]">
                {{ type.label }}
              </a>
            }
          </p>
          <dl class="hw">
            <div>
              <dt>Height</dt>
              <dd>{{ d.height }}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{{ d.weight }}</dd>
            </div>
          </dl>
        </div>
      </div>
      @if (d.flavor) {
        <p class="flavor">{{ d.flavor }}</p>
      }

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            @for (stat of d.stats; track stat.label) {
              <tr>
                <th scope="row">{{ stat.label }}</th>
                <td class="stat-num">{{ stat.value }}</td>
                <td class="stat-bar">
                  <span class="bar-track">
                    <span class="bar-fill" [style.width.%]="(stat.value / 255) * 100"></span>
                  </span>
                </td>
              </tr>
            }
            <tr class="total">
              <th scope="row">Total</th>
              <td class="stat-num">{{ d.total }}</td>
              <td class="stat-bar">
                <span class="bar-track">
                  <span class="bar-fill" [style.width.%]="(d.total / 720) * 100"></span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          @for (ability of d.abilities; track ability.name) {
            <li>
              <a [routerLink]="['/abilities', ability.name]">{{ ability.label }}</a>
              @if (ability.hidden) {
                <span> (hidden)</span>
              }
            </li>
          }
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ng-template #evolutionNode let-link>
          <li>
            <a [routerLink]="['/pokemon', link.species.name]">{{ humanize(link.species.name) }}</a>
            @if (link.evolves_to.length) {
              <ul>
                @for (child of link.evolves_to; track child.species.name) {
                  <ng-container
                    *ngTemplateOutlet="evolutionNode; context: { $implicit: child }"
                  ></ng-container>
                }
              </ul>
            }
          </li>
        </ng-template>
        <ul class="plain-list evo-tree">
          <ng-container
            *ngTemplateOutlet="evolutionNode; context: { $implicit: d.chain }"
          ></ng-container>
        </ul>
      </section>

      <section class="panel" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="field game-field">
          <label for="game">Game</label>
          <select id="game" (change)="onGame($event)">
            @for (game of d.games; track game.name) {
              <option [value]="game.name" [selected]="game.name === d.selectedGame">
                {{ game.label }}
              </option>
            }
          </select>
        </div>

        @for (table of d.tables; track table.method) {
          <table class="moves-table">
            <caption>{{ table.label }}</caption>
            <thead>
              <tr>
                @for (column of columnsFor(table); track column.key) {
                  <th
                    scope="col"
                    [class.num]="column.numeric"
                    [attr.aria-sort]="ariaSort(table.method, column.key)"
                  >
                    <button type="button" (click)="toggleSort(table.method, column.key)">
                      {{ column.label }}
                    </button>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of sortedRows(table); track $index) {
                <tr>
                  @if (table.hasLevel) {
                    <td>{{ row.level ?? '\u2014' }}</td>
                  }
                  <td>
                    <a [routerLink]="['/moves', row.moveName]">{{ row.moveLabel }}</a>
                  </td>
                  <td>
                    <a class="badge type-{{ row.typeName }}" [routerLink]="['/types', row.typeName]">
                      {{ row.typeLabel }}
                    </a>
                  </td>
                  <td>{{ row.category }}</td>
                  <td class="num">{{ row.power ?? '\u2014' }}</td>
                  <td class="num">{{ row.accuracy ?? '\u2014' }}</td>
                  <td class="num">{{ row.pp ?? '\u2014' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class PokemonPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly data = routeDataSignal<PokemonPageData | null>('data');

  protected readonly dexNumber = dexNumber;
  protected readonly humanize = humanize;

  /** Sort state per table (keyed by learn method). */
  private readonly sorts = signal<Record<string, { key: string; dir: 1 | -1 }>>({});

  constructor() {
    effect(() => {
      const d = this.data();
      if (d) this.title.setTitle(pageTitle(d.englishName));
    });
  }

  columnsFor(table: MovesTableData): Column[] {
    return table.hasLevel ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level');
  }

  ariaSort(method: string, key: string): 'ascending' | 'descending' | null {
    const sort = this.sorts()[method];
    return sort && sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : null;
  }

  toggleSort(method: string, key: string): void {
    this.sorts.update((state) => {
      const current = state[method];
      const dir: 1 | -1 = current && current.key === key ? (current.dir === 1 ? -1 : 1) : 1;
      return { ...state, [method]: { key, dir } };
    });
  }

  sortedRows(table: MovesTableData): MoveRow[] {
    const sort = this.sorts()[table.method];
    if (!sort) return table.rows;
    const field = COLUMNS.find((c) => c.key === sort.key)!.field;
    return [...table.rows].sort((a, b) => {
      const va = a[field];
      const vb = b[field];
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // missing values sort last in both directions
      if (vb == null) return -1;
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sort.dir * cmp;
    });
  }

  onGame(event: Event): void {
    const game = (event.target as HTMLSelectElement).value;
    this.router.navigate([], { relativeTo: this.route, queryParams: { game } });
  }
}
