import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-message',
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Not found</h1>
    <p class="not-found-link"><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFoundMessage {}
