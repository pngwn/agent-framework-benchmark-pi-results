import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TypesVM } from '../../shared/models';

@Component({
  selector: 'app-types-page',
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Types</h1>
    <ul class="type-grid">
      @for (type of vm().types; track type.name) {
        <li>
          <a class="type-tile" [style.background]="'var(--type-' + type.name + ')'" [routerLink]="['/types', type.name]">{{
            type.label
          }}</a>
        </li>
      }
    </ul>
  `,
})
export default class TypesPage {
  readonly vm = input.required<TypesVM>();
}
