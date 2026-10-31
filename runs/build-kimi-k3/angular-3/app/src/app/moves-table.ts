import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface MoveRow {
  level: number | null;
  move: string;
  moveEn: string;
  typeName: string;
  typeEn: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveGroup {
  method: string;
  label: string;
  rows: MoveRow[];
}

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';

const COLUMNS: Record<Column, string> = {
  level: 'Level',
  move: 'Move',
  type: 'Type',
  category: 'Category',
  power: 'Power',
  accuracy: 'Accuracy',
  pp: 'PP',
};

/** A sortable table of the moves a Pokémon learns via one learn method. */
@Component({
  selector: 'app-moves-table',
  imports: [RouterLink],
  templateUrl: './moves-table.html',
  styleUrl: './moves-table.css',
})
export class MovesTable {
  readonly group = input.required<MoveGroup>();

  protected readonly sortColumn = signal<Column | null>(null);
  protected readonly sortDirection = signal<'ascending' | 'descending'>('ascending');

  protected readonly isLevelUp = computed(() => this.group().method === 'level-up');
  protected readonly columns = computed<Column[]>(() =>
    this.isLevelUp()
      ? ['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp']
      : ['move', 'type', 'category', 'power', 'accuracy', 'pp'],
  );
  protected readonly labels = COLUMNS;

  protected readonly rows = computed(() => {
    const column = this.sortColumn();
    const rows = [...this.group().rows];
    if (!column) return rows;
    const direction = this.sortDirection() === 'ascending' ? 1 : -1;
    return rows.sort((a, b) => {
      const va = this.value(a, column);
      const vb = this.value(b, column);
      // Missing values sort last in both directions.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * direction;
    });
  });

  protected sort(column: Column): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'ascending' ? 'descending' : 'ascending'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('ascending');
    }
  }

  protected display(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  private value(row: MoveRow, column: Column): string | number | null {
    switch (column) {
      case 'level':
        return row.level;
      case 'move':
        return row.moveEn;
      case 'type':
        return row.typeEn;
      case 'category':
        return row.category;
      case 'power':
        return row.power;
      case 'accuracy':
        return row.accuracy;
      case 'pp':
        return row.pp;
    }
  }
}
