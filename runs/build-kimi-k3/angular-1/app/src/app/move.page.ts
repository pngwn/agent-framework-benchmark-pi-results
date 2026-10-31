import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokemonCardsComponent } from './cards.component';
import { NotFoundComponent } from './not-found.component';
import { MovePageData } from './page-data';

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, PokemonCardsComponent, NotFoundComponent],
  template: `
    @if (data(); as d) {
      <h1>{{ d.englishName }}</h1>
      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd>
            <a class="type-badge type-{{ d.type.name }}" [routerLink]="['/types', d.type.name]">{{ d.type.english }}</a>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ d.category }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ d.power }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ d.accuracy }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ d.pp }}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ d.effect }}</p>
      </section>

      <section class="panel" aria-labelledby="learned-heading">
        <h2 id="learned-heading">Learned by</h2>
        <p class="count">{{ d.learned.length }} Pokémon</p>
        <app-pokemon-cards [cards]="d.learned" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .facts {
      display: flex;
      gap: var(--space-6);
      margin: 0 0 var(--space-6);
    }
    .facts dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-bottom: var(--space-1);
    }
    .facts dd {
      margin: 0;
      font-weight: var(--weight-semibold);
    }
    .count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-4);
    }
    section p {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovePage {
  protected readonly data = input.required<MovePageData | null>();

  constructor() {
    const title = inject(Title);
    effect(() => {
      const data = this.data();
      title.setTitle(data ? `${data.englishName} – Pokédex` : 'Not found – Pokédex');
    });
  }
}
