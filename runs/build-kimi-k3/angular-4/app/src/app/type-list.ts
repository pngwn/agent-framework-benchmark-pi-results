import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TypeListData } from './types.resolver';

/** `/types` — the 18 types. */
@Component({
  imports: [RouterLink],
  template: `
    <h1>Types</h1>
    <ul class="type-tiles">
      @for (type of data().types; track type.name) {
        <li>
          <a class="type-tile type-{{ type.name }}" [routerLink]="['/types', type.name]">
            {{ type.english }}
          </a>
        </li>
      }
    </ul>
  `,
})
export class TypeList {
  readonly data = input.required<TypeListData>();

  constructor() {
    inject(Title).setTitle('Types – Pokédex');
  }
}
