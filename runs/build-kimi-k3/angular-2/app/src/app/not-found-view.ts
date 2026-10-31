import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { pageTitle } from './utils';

/** The "Not found" page body, also rendered by detail pages for unknown resources. */
@Component({
  selector: 'app-not-found-view',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFoundView {
  constructor() {
    inject(Title).setTitle(pageTitle('Not found'));
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 404;
  }
}
