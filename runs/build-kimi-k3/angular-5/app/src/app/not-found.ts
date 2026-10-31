import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFound {
  constructor() {
    inject(Title).setTitle('Not found – Pokédex');
  }
}
