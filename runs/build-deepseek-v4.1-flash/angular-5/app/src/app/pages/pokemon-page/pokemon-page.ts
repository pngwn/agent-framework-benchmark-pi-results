import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokemonPageData } from '../../api/page-data.models';
import { NotFoundMessage } from '../../components/not-found-message';
import { MoveTable } from '../../components/move-table';
import { dexNumber } from '../../api/format';

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, MoveTable, NotFoundMessage],
  templateUrl: './pokemon-page.html',
})
export class PokemonPage {
  readonly pageData = input<PokemonPageData | null>(null);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  constructor() {
    effect(() => {
      const data = this.pageData();
      this.title.setTitle(data ? `${data.displayName} – Pokédex` : 'Not found – Pokédex');
    });
  }

  dex(id: number): string {
    return dexNumber(id);
  }

  onGameChange(event: Event): void {
    const game = (event.target as HTMLSelectElement).value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game },
      replaceUrl: true,
      fragment: this.route.snapshot.fragment ?? undefined,
    });
  }
}
