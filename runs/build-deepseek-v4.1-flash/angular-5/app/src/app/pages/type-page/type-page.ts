import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TypePageData } from '../../api/page-data.models';
import { PokemonCards } from '../../components/pokemon-cards';
import { NotFoundMessage } from '../../components/not-found-message';

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, PokemonCards, NotFoundMessage],
  templateUrl: './type-page.html',
})
export class TypePage {
  readonly pageData = input<TypePageData | null>(null);
  private readonly title = inject(Title);

  constructor() {
    effect(() => {
      const data = this.pageData();
      this.title.setTitle(data ? `${data.displayName} – Pokédex` : 'Not found – Pokédex');
    });
  }
}
