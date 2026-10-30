import { Component, computed, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { orDash } from '../../shared/format';
import { MoveRow, MoveTableVM } from '../../shared/models';
import { TypeBadge } from '../../shared/type-badge';

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

const LABELS: Record<Column, string> = {
  level: 'Level',
  move: 'Move',
  type: 'Type',
  category: 'Category',
  power: 'Power',
  accuracy: 'Accuracy',
  pp: 'PP',
};

const VALUE: Record<Column, (row: MoveRow) => string | number | null> = {
  level: (r) => r.level,
  move: (r) => r.label,
  type: (r) => r.type.label,
  category: (r) => r.category,
  power: (r) => r.power,
  accuracy: (r) => r.accuracy,
  pp: (r) => r.pp,
};

function compareValues(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
}

const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

@Component({
  selector: 'app-move-table',
  imports: [RouterLink, TypeBadge],
  template: `
    <div class="table-scroll" tabindex="0" role="group" [attr.aria-label]="table().label + ' moves'">
      <table class="data-table move-table">
        <caption>{{ table().label }}</caption>
        <thead>
          <tr>
            @for (column of columns(); track column) {
              <th scope="col" [attr.aria-sort]="sort()?.column === column ? sort()!.direction : null">
                <button type="button" class="sort-button" (click)="sortBy(column)">{{ labels[column] }}</button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.name + '|' + row.level) {
            <tr>
              @if (isLevelUp()) {
                <td>{{ row.level }}</td>
              }
              <td><a [routerLink]="['/moves', row.name]">{{ row.label }}</a></td>
              <td><app-type-badge [type]="row.type" /></td>
              <td>{{ dash(row.category) }}</td>
              <td>{{ dash(row.power) }}</td>
              <td>{{ dash(row.accuracy) }}</td>
              <td>{{ dash(row.pp) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MoveTable {
  readonly table = input.required<MoveTableVM>();

  protected readonly labels = LABELS;
  protected readonly dash = orDash;
  protected readonly isLevelUp = computed(() => this.table().method === 'level-up');
  protected readonly columns = computed<Column[]>(() =>
    this.isLevelUp()
      ? ['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp']
      : ['move', 'type', 'category', 'power', 'accuracy', 'pp'],
  );

  /** The user's chosen sort; null means the default order. Resets when the table changes. */
  protected readonly sort = linkedSignal<MoveTableVM, { column: Column; direction: Direction } | null>({
    source: this.table,
    computation: () => null,
  });

  protected readonly rows = computed(() => {
    const rows = [...this.table().rows];
    const sort = this.sort();
    if (!sort) {
      return this.isLevelUp() ? rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || byName(a, b)) : rows.sort(byName);
    }
    const value = VALUE[sort.column];
    const sign = sort.direction === 'ascending' ? 1 : -1;
    return rows.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      // Missing values go last in both directions.
      if (va === null || vb === null) return va === vb ? byName(a, b) : va === null ? 1 : -1;
      return sign * compareValues(va, vb) || byName(a, b);
    });
  });

  protected sortBy(column: Column): void {
    const current = this.sort();
    this.sort.set({
      column,
      direction: current?.column === column && current.direction === 'ascending' ? 'descending' : 'ascending',
    });
  }
}
