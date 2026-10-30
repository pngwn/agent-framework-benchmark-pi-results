import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EvolutionNode } from '../../shared/models';

/** An evolution chain as nested lists: each species' evolutions are a list in its item. */
@Component({
  selector: 'app-evolution-tree',
  imports: [RouterLink, EvolutionTree],
  template: `
    <ul class="evolution">
      @for (node of nodes(); track node.name) {
        <li>
          <a [routerLink]="['/pokemon', node.name]" [attr.aria-current]="node.name === current() ? 'page' : null">{{
            node.label
          }}</a>
          @if (node.evolvesTo.length) {
            <app-evolution-tree [nodes]="node.evolvesTo" [current]="current()" />
          }
        </li>
      }
    </ul>
  `,
  host: { style: 'display: contents' },
})
export class EvolutionTree {
  readonly nodes = input.required<EvolutionNode[]>();
  readonly current = input<string>('');
}
