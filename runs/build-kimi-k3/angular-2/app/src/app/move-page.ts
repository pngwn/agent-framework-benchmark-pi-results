import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Cards } from './cards';
import { MovePageData } from './resolvers';
import { NotFoundView } from './not-found-view';
import { routeDataSignal } from './route-data';
import { pageTitle } from './utils';

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, Cards, NotFoundView],
  template: `
    @if (data(); as d) {
      <h1>{{ d.englishName }}</h1>

      <dl class="fact-strip panel">
        <div>
          <dt>Type</dt>
          <dd>
            <a class="badge type-{{ d.typeName }}" [routerLink]="['/types', d.typeName]">
              {{ d.typeLabel }}
            </a>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ d.category }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ d.power ?? '\u2014' }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ d.accuracy ?? '\u2014' }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ d.pp ?? '\u2014' }}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ d.effect }}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{{ d.learnedBy.length }} Pokémon</p>
        <app-cards [cards]="d.learnedBy" />
      </section>
    } @else {
      <app-not-found-view />
    }
  `,
})
export class MovePage {
  private readonly title = inject(Title);
  readonly data = routeDataSignal<MovePageData | null>('data');

  constructor() {
    effect(() => {
      const d = this.data();
      if (d) this.title.setTitle(pageTitle(d.englishName));
    });
  }
}
