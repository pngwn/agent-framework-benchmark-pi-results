import { Component, input } from '@angular/core';
import { CardList } from '../../shared/card-list';
import { orDash } from '../../shared/format';
import { MoveVM } from '../../shared/models';
import { TypeBadge } from '../../shared/type-badge';
import NotFound from '../not-found/not-found';

@Component({
  selector: 'app-move-page',
  imports: [CardList, TypeBadge, NotFound],
  template: `
    @if (vm(); as vm) {
      <h1 class="page-title">{{ vm.title }}</h1>
      <dl class="panel facts facts--panel">
        <div>
          <dt>Type</dt>
          <dd>
            @if (vm.type) {
              <app-type-badge [type]="vm.type" />
            } @else {
              —
            }
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ dash(vm.category) }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ dash(vm.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ dash(vm.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ dash(vm.pp) }}</dd>
        </div>
      </dl>
      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ dash(vm.effect) }}</p>
      </section>
      <section class="panel" aria-labelledby="learned-heading">
        <h2 id="learned-heading">Learned by</h2>
        <app-card-list [cards]="vm.pokemon" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
})
export default class MovePage {
  readonly vm = input.required<MoveVM | null>();
  protected readonly dash = orDash;
}
