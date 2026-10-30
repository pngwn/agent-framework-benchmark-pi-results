import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Not found</h1>
    <p class="not-found-link"><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFound {
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Not found – Pokédex');
  }
}
