import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NotFoundContent } from '../../shared/not-found-content';

@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundContent],
  template: `<app-not-found-content />`,
})
export class NotFoundPage {
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Not found – Pokédex');
  }
}
