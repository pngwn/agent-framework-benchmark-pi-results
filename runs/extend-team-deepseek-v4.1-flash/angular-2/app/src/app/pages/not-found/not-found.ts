import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Not found</h1>
    <p class="not-found__back"><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export default class NotFound {
  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
