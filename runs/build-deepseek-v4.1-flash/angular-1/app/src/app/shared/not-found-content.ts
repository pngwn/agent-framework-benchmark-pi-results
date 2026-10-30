import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-content',
  imports: [RouterLink],
  template: `
    <main class="page">
      <h1>Not found</h1>
      <p><a routerLink="/">Back to the Pokédex</a></p>
    </main>
  `,
})
export class NotFoundContent {}
