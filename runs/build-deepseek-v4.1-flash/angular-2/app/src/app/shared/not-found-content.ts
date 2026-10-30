import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-content',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFoundContent {}
