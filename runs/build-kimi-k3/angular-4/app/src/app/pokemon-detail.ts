import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { MoveRow, MoveTable, PokemonPageData } from './pokemon.resolver';
import { NotFoundView } from './not-found-view';
import { TypePill } from './type-pill';
import { dexNumber, humanize, orDash } from './util';

interface Column {
  key: keyof MoveRow;
  label: string;
}

interface SortSpec {
  key: keyof MoveRow;
  dir: 1 | -1;
}

const COLUMNS: Column[] = [
  { key: 'level', label: 'Level' },
  { key: 'english', label: 'Move' },
  { key: 'typeEnglish', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

/** `/pokemon/:name` — species summary, base stats, abilities, evolution and moves. */
@Component({
  imports: [RouterLink, NgTemplateOutlet, NotFoundView, TypePill],
  template: `
    @if (data(); as d) {
      <div class="card summary">
        @if (d.artwork) {
          <img class="summary-artwork" [src]="d.artwork" [alt]="d.heading" width="288" height="288" />
        }
        <div class="summary-info">
          <p class="summary-dex">{{ dex(d.dexId) }}</p>
          <h1>{{ d.heading }}</h1>
          @if (d.genus) {
            <p class="summary-genus">{{ d.genus }}</p>
          }
          <p class="summary-types">
            @for (type of d.types; track type.name) {
              <app-type-pill [name]="type.name" [label]="type.english" />
            }
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{{ d.height }}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{{ d.weight }}</dd>
            </div>
          </dl>
          @if (d.flavor) {
            <p class="summary-flavor">{{ d.flavor }}</p>
          }
        </div>
      </div>

      <section class="card" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            @for (stat of d.stats; track stat.label) {
              <tr>
                <th scope="row">{{ stat.label }}</th>
                <td class="stat-value">{{ stat.value }}</td>
                <td class="stat-bar">
                  <span class="stat-track">
                    <span class="stat-fill" [style.width.%]="(stat.value / 200) * 100"></span>
                  </span>
                </td>
              </tr>
            }
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{{ d.total }}</td>
              <td class="stat-bar">
                <span class="stat-track">
                  <span class="stat-fill" [style.width.%]="(d.total / 700) * 100"></span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card" aria-labelledby="abilities-heading">
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

      <section class="card" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ul class="plain-list evo-tree">
          <ng-container
            [ngTemplateOutlet]="evoNode"
            [ngTemplateOutletContext]="{ $implicit: d.evoChain }"
          />
        </ul>
        <ng-template #evoNode let-node>
          <li>
            <a [routerLink]="['/pokemon', node.species.name]">{{ humanize(node.species.name) }}</a>
            @if (node.evolves_to.length) {
              <ul>
                @for (child of node.evolves_to; track child.species.name) {
                  <ng-container
                    [ngTemplateOutlet]="evoNode"
                    [ngTemplateOutletContext]="{ $implicit: child }"
                  />
                }
              </ul>
            }
          </li>
        </ng-template>
      </section>

      <section class="card" aria-labelledby="moves-heading" id="moves">
        <h2 id="moves-heading">Moves</h2>
        @if (d.versionGroups.length) {
          <div class="game-select">
            <label for="game">Game</label>
            <select id="game" (change)="onGameChange($event)">
              @for (group of d.versionGroups; track group.name) {
                <option [value]="group.name" [selected]="group.name === d.selectedGame">
                  {{ group.label }}
                </option>
              }
            </select>
          </div>
          @for (table of d.tables; track table.method) {
            <table class="moves-table">
              <caption>{{ table.label }}</caption>
              <thead>
                <tr>
                  @for (column of columns(table.method); track column.key) {
                    <th scope="col" [attr.aria-sort]="ariaSort(table, column.key)">
                      <button type="button" (click)="toggleSort(table, column.key)">
                        {{ column.label
                        }}<span class="sort-arrow" aria-hidden="true">{{
                          sortArrow(table, column.key)
                        }}</span>
                      </button>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of sortedRows(table); track row.name + '|' + row.level) {
                  <tr>
                    @if (table.method === 'level-up') {
                      <td>{{ row.level }}</td>
                    }
                    <td>
                      <a [routerLink]="['/moves', row.name]">{{ row.english }}</a>
                    </td>
                    <td>
                      <app-type-pill [name]="row.type" [label]="row.typeEnglish" />
                    </td>
                    <td>{{ row.category }}</td>
                    <td>{{ orDash(row.power) }}</td>
                    <td>{{ orDash(row.accuracy) }}</td>
                    <td>{{ orDash(row.pp) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class PokemonDetail {
  readonly data = input.required<PokemonPageData | null>();

  private readonly router = inject(Router);
  private readonly sorts = signal<Record<string, SortSpec>>({});

  protected readonly dex = dexNumber;
  protected readonly humanize = humanize;
  protected readonly orDash = orDash;

  constructor() {
    // Reset sort state when navigating to another Pokémon or game.
    effect(() => {
      this.data();
      this.sorts.set({});
    });
  }

  protected columns(method: string): Column[] {
    return method === 'level-up' ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level');
  }

  private defaultSort(table: MoveTable): SortSpec {
    return table.method === 'level-up' ? { key: 'level', dir: 1 } : { key: 'english', dir: 1 };
  }

  private sortSpec(table: MoveTable): SortSpec {
    return this.sorts()[table.method] ?? this.defaultSort(table);
  }

  protected ariaSort(table: MoveTable, key: keyof MoveRow): 'ascending' | 'descending' | null {
    const spec = this.sortSpec(table);
    return spec.key === key ? (spec.dir === 1 ? 'ascending' : 'descending') : null;
  }

  protected sortArrow(table: MoveTable, key: keyof MoveRow): string {
    const sort = this.ariaSort(table, key);
    return sort === 'ascending' ? ' ▲' : sort === 'descending' ? ' ▼' : '';
  }

  protected toggleSort(table: MoveTable, key: keyof MoveRow) {
    const current = this.sortSpec(table);
    const dir = current.key === key && current.dir === 1 ? -1 : 1;
    this.sorts.update((sorts) => ({ ...sorts, [table.method]: { key, dir } }));
  }

  protected sortedRows(table: MoveTable): MoveRow[] {
    const spec = this.sortSpec(table);
    const key = spec.key;
    const tieBreak = (a: MoveRow, b: MoveRow) =>
      (table.method === 'level-up' ? a.level - b.level : 0) || a.english.localeCompare(b.english);
    return [...table.rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return tieBreak(a, b);
      if (av == null) return 1; // missing values sort last in both directions
      if (bv == null) return -1;
      const compared =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return compared * spec.dir || tieBreak(a, b);
    });
  }

  protected onGameChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      queryParams: { game: value },
      queryParamsHandling: 'merge',
      preserveFragment: true,
    });
  }
}
