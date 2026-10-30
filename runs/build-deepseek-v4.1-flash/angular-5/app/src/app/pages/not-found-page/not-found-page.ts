import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NotFoundMessage } from '../../components/not-found-message';

@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundMessage],
  template: `
    <main class="page">
      <app-not-found-message />
    </main>
  `,
})
export class NotFoundPage {
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Not found – Pokédex');
  }
}
