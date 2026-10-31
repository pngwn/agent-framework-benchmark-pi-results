import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A type badge linking to the type page, labelled with the English type name. */
@Component({
  selector: 'app-type-pill',
  imports: [RouterLink],
  template: `
    <a class="type-badge type-{{ name() }}" [routerLink]="['/types', name()]">{{ label() }}</a>
  `,
})
export class TypePill {
  readonly name = input.required<string>();
  readonly label = input.required<string>();
}
