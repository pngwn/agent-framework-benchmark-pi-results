import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TypeCatalogService, TypeInfo } from './catalog';

@Component({
  selector: 'app-types',
  imports: [RouterLink],
  template: `
    <h1>Types</h1>
    <ul class="type-list">
      @for (type of types(); track type.name) {
        <li>
          <a class="type-tile type-{{ type.name }}" [routerLink]="['/types', type.name]">{{ type.enName }}</a>
        </li>
      }
    </ul>
  `,
  styles: `
    .type-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .type-tile {
      display: block;
      min-width: 8rem;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      color: var(--color-on-type);
      text-align: center;
      text-decoration: none;
    }

    .type-tile:hover {
      text-decoration: underline;
    }
  `,
})
export class Types {
  private readonly typeCatalog = inject(TypeCatalogService);

  protected readonly types = signal<TypeInfo[]>([]);

  constructor() {
    inject(Title).setTitle('Types – Pokédex');
    void this.typeCatalog.all().then((types) => this.types.set(types));
  }
}
