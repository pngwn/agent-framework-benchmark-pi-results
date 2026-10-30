import { Component, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AbilityPageData } from '../../api/page-data.models';
import { PokemonCards } from '../../components/pokemon-cards';
import { NotFoundMessage } from '../../components/not-found-message';

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCards, NotFoundMessage],
  templateUrl: './ability-page.html',
})
export class AbilityPage {
  readonly pageData = input<AbilityPageData | null>(null);
  private readonly title = inject(Title);

  constructor() {
    effect(() => {
      const data = this.pageData();
      this.title.setTitle(data ? `${data.displayName} – Pokédex` : 'Not found – Pokédex');
    });
  }
}
