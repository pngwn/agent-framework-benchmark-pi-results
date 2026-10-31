import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoveRow, MoveTableData } from './page-data';
import { orDash } from './util';

type SortDir = 'ascending' | 'descending';

interface Column {
  key: string;
  label: string;
}

function compareValues(a: string | number | null, b: string | number | null, dir: SortDir): number {
  // Missing values sort last in both directions.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const result = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);
  return dir === 'ascending' ? result : -result;
}

/** A sortable table of moves learned via one learn method. */
@Component({
  selector: 'app-move-table',
  imports: [RouterLink],
  template: `
    <table class="moves-table">
      <caption>{{ table().methodLabel }}</caption>
      <thead>
        <tr>
          @for (column of columns(); track column.key) {
            <th scope="col" [attr.aria-sort]="ariaSort(column.key)">
              <button type="button" class="sort-button" (click)="toggle(column.key)">
                {{ column.label }}
                <span class="sort-indicator" aria-hidden="true">{{ indicator(column.key) }}</span>
              </button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track $index) {
          <tr>
            @for (column of columns(); track column.key) {
              <td>
                @switch (column.key) {
                  @case ('level') {
                    {{ row.level ?? '—' }}
                  }
                  @case ('move') {
                    <a [routerLink]="['/moves', row.apiName]">{{ row.name }}</a>
                  }
                  @case ('type') {
                    <a class="type-badge type-{{ row.type.name }}" [routerLink]="['/types', row.type.name]">{{
                      row.type.english
                    }}</a>
                  }
                  @case ('category') {
                    {{ row.category }}
                  }
                  @case ('power') {
                    {{ orDash(row.power) }}
                  }
                  @case ('accuracy') {
                    {{ orDash(row.accuracy) }}
                  }
                  @case ('pp') {
                    {{ orDash(row.pp) }}
                  }
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styleUrl: './move-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveTableComponent {
  readonly table = input.required<MoveTableData>();

  protected readonly orDash = orDash;

  private readonly sortKey = signal<string | null>(null);
  private readonly sortDir = signal<SortDir>('ascending');

  protected readonly columns = computed<Column[]>(() => [
    ...(this.table().hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]);

  protected readonly rows = computed<MoveRow[]>(() => {
    const key = this.sortKey();
    const rows = [...this.table().rows];
    if (!key) return rows;
    const dir = this.sortDir();
    const value = (row: MoveRow): string | number | null => {
      switch (key) {
        case 'level':
          return row.level;
        case 'move':
          return row.name;
        case 'type':
          return row.type.english;
        case 'category':
          return row.category;
        case 'power':
          return row.power;
        case 'accuracy':
          return row.accuracy;
        default:
          return row.pp;
      }
    };
    rows.sort(
      (a, b) => compareValues(value(a), value(b), dir) || (key === 'level' ? a.name.localeCompare(b.name) : 0),
    );
    return rows;
  });

  protected toggle(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'ascending' ? 'descending' : 'ascending'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('ascending');
    }
  }

  protected ariaSort(key: string): SortDir | null {
    return this.sortKey() === key ? this.sortDir() : null;
  }

  protected indicator(key: string): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'ascending' ? '▲' : '▼';
  }
}
