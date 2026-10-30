import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoveRowData, MoveTableData } from '../api/page-data.models';
import { compareText } from '../api/format';

type SortKey = 'level' | 'moveDisplay' | 'typeDisplay' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDirection = 'ascending' | 'descending';

interface Column {
  key: SortKey;
  label: string;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'moveDisplay', label: 'Move' },
  { key: 'typeDisplay', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

@Component({
  selector: 'app-move-table',
  imports: [RouterLink],
  templateUrl: './move-table.html',
})
export class MoveTable {
  readonly table = input.required<MoveTableData>();

  readonly sortKey = signal<SortKey | null>(null);
  readonly sortDirection = signal<SortDirection>('ascending');

  readonly columns = computed<Column[]>(() =>
    this.table().isLevelUp
      ? [{ key: 'level', label: 'Level', numeric: true }, ...COLUMNS]
      : COLUMNS,
  );

  readonly rows = computed(() => {
    const key = this.sortKey();
    if (!key) return this.table().rows;
    const direction = this.sortDirection();
    return [...this.table().rows].sort((a, b) => this.compareRows(a, b, key, direction));
  });

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'ascending' ? 'descending' : 'ascending');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('ascending');
    }
  }

  ariaSort(key: SortKey): SortDirection | null {
    return this.sortKey() === key ? this.sortDirection() : null;
  }

  private compareRows(
    a: MoveRowData,
    b: MoveRowData,
    key: SortKey,
    direction: SortDirection,
  ): number {
    const aValue = a[key];
    const bValue = b[key];
    const aMissing = aValue === null || aValue === undefined;
    const bMissing = bValue === null || bValue === undefined;
    if (aMissing || bMissing) {
      if (aMissing && bMissing) return 0;
      return aMissing ? 1 : -1;
    }

    const column = this.columns().find((entry) => entry.key === key);
    const compared =
      column?.numeric && typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : compareText(String(aValue), String(bValue));
    return direction === 'ascending' ? compared : -compared;
  }
}
