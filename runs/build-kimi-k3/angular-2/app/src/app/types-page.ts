import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TypeInfo } from './dex.service';
import { routeDataSignal } from './route-data';
import { pageTitle } from './utils';

@Component({
  selector: 'app-types-page',
  imports: [RouterLink],
  template: `
    <h1>Types</h1>
    <ul class="type-list">
      @for (type of types(); track type.name) {
        <li>
          <a class="type-chip type-{{ type.name }}" [routerLink]="['/types', type.name]">
            {{ type.label }}
          </a>
        </li>
      }
    </ul>
  `,
})
export class TypesPage {
  readonly types = routeDataSignal<TypeInfo[]>('data');

  constructor() {
    inject(Title).setTitle(pageTitle('Types'));
  }
}
