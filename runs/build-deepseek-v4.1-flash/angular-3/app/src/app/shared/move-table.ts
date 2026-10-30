import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { humanize } from '../core/helpers';

export interface MoveRow {
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

type SortKey = 'level' | 'moveName' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDirection = 'ascending' | 'descending';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

@Component({
  selector: 'app-move-table',
  imports: [RouterLink],
  template: `
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{{ label() }}</caption>
        <thead>
          <tr>
            @if (isLevelUp()) {
              <th scope="col" [attr.aria-sort]="ariaSort('level')" (click)="$event.stopPropagation(); sortBy('level')">
                <button type="button" (click)="$event.stopPropagation(); sortBy('level')">Level</button>
              </th>
            }
            <th scope="col" [attr.aria-sort]="ariaSort('moveName')" (click)="$event.stopPropagation(); sortBy('moveName')">
              <button type="button" (click)="$event.stopPropagation(); sortBy('moveName')">Move</button>
            </th>
            <th scope="col" [attr.aria-sort]="ariaSort('typeLabel')" (click)="$event.stopPropagation(); sortBy('typeLabel')">
              <button type="button" (click)="$event.stopPropagation(); sortBy('typeLabel')">Type</button>
            </th>
            <th scope="col" [attr.aria-sort]="ariaSort('category')" (click)="$event.stopPropagation(); sortBy('category')">
              <button type="button" (click)="$event.stopPropagation(); sortBy('category')">Category</button>
            </th>
            <th scope="col" [attr.aria-sort]="ariaSort('power')" (click)="$event.stopPropagation(); sortBy('power')">
              <button type="button" (click)="$event.stopPropagation(); sortBy('power')">Power</button>
            </th>
            <th scope="col" [attr.aria-sort]="ariaSort('accuracy')" (click)="$event.stopPropagation(); sortBy('accuracy')">
              <button type="button" (click)="$event.stopPropagation(); sortBy('accuracy')">Accuracy</button>
            </th>
            <th scope="col" [attr.aria-sort]="ariaSort('pp')" (click)="$event.stopPropagation(); sortBy('pp')">
              <button type="button" (click)="$event.stopPropagation(); sortBy('pp')">PP</button>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (row of sortedRows(); track row.moveApiName + '-' + row.level) {
            <tr>
              @if (isLevelUp()) {
                <td>{{ row.level }}</td>
              }
              <td><a [routerLink]="['/moves', row.moveApiName]">{{ row.moveName }}</a></td>
              <td>
                <a [routerLink]="['/types', row.typeName]" [class]="'type-badge type-' + row.typeName">
                  {{ row.typeLabel }}
                </a>
              </td>
              <td>{{ row.category }}</td>
              <td>{{ display(row.power) }}</td>
              <td>{{ display(row.accuracy) }}</td>
              <td>{{ display(row.pp) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MoveTable {
  readonly methodName = input.required<string>();
  readonly rows = input.required<MoveRow[]>();

  protected readonly label = computed(() => humanize(this.methodName()));
  protected readonly isLevelUp = computed(() => this.methodName() === 'level-up');
  private readonly sort = signal<SortState | null>(null);

  protected readonly sortedRows = computed(() => {
    const rows = [...this.rows()];
    const state = this.sort();
    if (!state) {
      rows.sort((a, b) => this.defaultCompare(a, b));
    } else {
      rows.sort((a, b) => this.compare(a, b, state));
    }
    return rows;
  });

  protected ariaSort(key: SortKey): SortDirection | null {
    const state = this.sort();
    return state?.key === key ? state.direction : null;
  }

  protected sortBy(key: SortKey): void {
    const state = this.sort();
    if (state?.key === key) {
      this.sort.set({
        key,
        direction: state.direction === 'ascending' ? 'descending' : 'ascending',
      });
    } else {
      this.sort.set({ key, direction: 'ascending' });
    }
  }

  protected display(value: number | null): string {
    return value === null || value === undefined ? '—' : String(value);
  }

  private defaultCompare(a: MoveRow, b: MoveRow): number {
    if (this.isLevelUp()) {
      const level = a.level - b.level;
      if (level !== 0) return level;
    }
    return a.moveName.localeCompare(b.moveName);
  }

  private compare(a: MoveRow, b: MoveRow, state: SortState): number {
    const aValue = a[state.key];
    const bValue = b[state.key];
    const aMissing = aValue === null || aValue === undefined;
    const bMissing = bValue === null || bValue === undefined;

    if (aMissing && bMissing) return a.moveName.localeCompare(b.moveName);
    if (aMissing) return 1;
    if (bMissing) return -1;

    let result =
      typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
    if (state.direction === 'descending') result = -result;
    return result === 0 ? a.moveName.localeCompare(b.moveName) : result;
  }
}
