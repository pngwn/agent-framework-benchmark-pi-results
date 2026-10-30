import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MovePageData } from '../../api/page-data.models';
import { PokemonCards } from '../../components/pokemon-cards';
import { NotFoundMessage } from '../../components/not-found-message';

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, PokemonCards, NotFoundMessage],
  templateUrl: './move-page.html',
})
export class MovePage {
  readonly pageData = input<MovePageData | null>(null);
  private readonly title = inject(Title);

  constructor() {
    effect(() => {
      const data = this.pageData();
      this.title.setTitle(data ? `${data.displayName} – Pokédex` : 'Not found – Pokédex');
    });
  }
}
