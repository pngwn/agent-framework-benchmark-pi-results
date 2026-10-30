import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TypeListPageData } from '../../api/page-data.models';

@Component({
  selector: 'app-type-list-page',
  imports: [RouterLink],
  templateUrl: './type-list-page.html',
})
export class TypeListPage {
  readonly pageData = input<TypeListPageData | null>(null);
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Types – Pokédex');
    effect(() => {
      if (this.pageData()) this.title.setTitle('Types – Pokédex');
    });
  }
}
