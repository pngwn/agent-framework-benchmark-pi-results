import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NotFoundComponent } from '../shared/not-found';

@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundComponent],
  template: '<app-not-found />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Not found – Pokédex');
  }
}
