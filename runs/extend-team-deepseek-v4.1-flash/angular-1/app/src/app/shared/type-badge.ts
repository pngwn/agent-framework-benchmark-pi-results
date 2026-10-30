import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NamedRef } from './models';

/** A type label in the type's color; a link to the type page unless `link` is false. */
@Component({
  selector: 'app-type-badge',
  imports: [RouterLink],
  template: `
    @if (link()) {
      <a class="type-badge" [style.background]="color()" [routerLink]="['/types', type().name]">{{ type().label }}</a>
    } @else {
      <span class="type-badge" [style.background]="color()">{{ type().label }}</span>
    }
  `,
  host: { style: 'display: contents' },
})
export class TypeBadge {
  readonly type = input.required<NamedRef>();
  readonly link = input(true);
  protected readonly color = computed(() => `var(--type-${this.type().name}, var(--color-text-muted))`);
}
