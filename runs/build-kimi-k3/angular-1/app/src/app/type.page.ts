import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokemonCardsComponent } from './cards.component';
import { NotFoundComponent } from './not-found.component';
import { TypePageData } from './page-data';

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, PokemonCardsComponent, NotFoundComponent],
  template: `
    @if (data(); as d) {
      <h1>{{ d.englishName }}</h1>

      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (r of d.relations; track r.term) {
            <div class="relation">
              <dt>{{ r.term }}</dt>
              <dd>
                @if (r.types.length) {
                  <span class="relation-types">
                    @for (t of r.types; track t.name) {
                      <a class="type-badge type-{{ t.name }}" [routerLink]="['/types', t.name]">{{ t.english }}</a>
                    }
                  </span>
                } @else {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ d.pokemon.length }} Pokémon</p>
        <app-pokemon-cards [cards]="d.pokemon" />
      </section>

      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ d.moves.length }} moves</p>
        <ul class="move-links">
          @for (m of d.moves; track m.name) {
            <li>
              <a [routerLink]="['/moves', m.name]">{{ m.humanName }}</a>
            </li>
          }
        </ul>
      </section>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .relations {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4) var(--space-6);
      margin: 0;
    }
    .relation dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-bottom: var(--space-1);
    }
    .relation dd {
      margin: 0;
    }
    .relation-types {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }
    .count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-4);
    }
    .move-links {
      list-style: none;
      margin: 0;
      padding: 0;
      column-width: 10rem;
      column-gap: var(--space-5);
      font-size: var(--text-sm);
    }
    .move-links li {
      margin-bottom: var(--space-2);
      break-inside: avoid;
    }
    @media (max-width: 40rem) {
      .relations {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypePage {
  protected readonly data = input.required<TypePageData | null>();

  constructor() {
    const title = inject(Title);
    effect(() => {
      const data = this.data();
      title.setTitle(data ? `${data.englishName} – Pokédex` : 'Not found – Pokédex');
    });
  }
}
