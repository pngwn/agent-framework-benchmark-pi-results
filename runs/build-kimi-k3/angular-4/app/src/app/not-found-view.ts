import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

/** Shared "Not found" content: heading plus a link back to the Pokédex. */
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
    inject(Title).setTitle('Not found – Pokédex');
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 404;
  }
}
