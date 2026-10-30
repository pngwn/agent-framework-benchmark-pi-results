import { Component, input } from '@angular/core';
import { CardList } from '../../shared/card-list';
import { orDash } from '../../shared/format';
import { AbilityVM } from '../../shared/models';
import NotFound from '../not-found/not-found';

@Component({
  selector: 'app-ability-page',
  imports: [CardList, NotFound],
  template: `
    @if (vm(); as vm) {
      <h1 class="page-title">{{ vm.title }}</h1>
      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ dash(vm.effect) }}</p>
      </section>
      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <app-card-list [cards]="vm.pokemon" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
})
export default class AbilityPage {
  readonly vm = input.required<AbilityVM | null>();
  protected readonly dash = orDash;
}
