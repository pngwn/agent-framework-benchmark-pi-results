import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MoveTableComponent } from './move-table.component';
import { NotFoundComponent } from './not-found.component';
import { PokemonPageData } from './page-data';
import { dexNumber } from './util';

@Component({
  selector: 'app-pokemon-page',
  imports: [NgTemplateOutlet, RouterLink, MoveTableComponent, NotFoundComponent],
  templateUrl: './pokemon.page.html',
  styleUrl: './pokemon.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPage {
  protected readonly data = input.required<PokemonPageData | null>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly dex = dexNumber;

  // The game select stays inert until hydration is done.
  protected readonly ready = signal(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
    const title = inject(Title);
    effect(() => {
      const data = this.data();
      title.setTitle(data ? `${data.englishName} – Pokédex` : 'Not found – Pokédex');
    });
  }

  protected statBarPercent(value: number): number {
    return Math.min(100, (value / 255) * 100);
  }

  protected totalBarPercent(total: number): number {
    return Math.min(100, (total / 720) * 100);
  }

  protected onGameChange(event: Event): void {
    const game = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game },
    });
  }
}
