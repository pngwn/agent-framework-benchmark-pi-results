import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Catalog } from './catalog.service';

@Component({
  selector: 'app-types-page',
  imports: [RouterLink],
  template: `
    <h1>Types</h1>
    <ul class="type-list">
      @for (t of data().types; track t.name) {
        <li>
          <a class="type-tile type-{{ t.name }}" [routerLink]="['/types', t.name]">{{ t.english }}</a>
        </li>
      }
    </ul>
  `,
  styles: `
    .type-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--space-3);
    }
    .type-tile {
      display: block;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      color: var(--color-on-type);
      text-align: center;
      text-decoration: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypesPage {
  protected readonly data = input.required<Catalog>();
}
