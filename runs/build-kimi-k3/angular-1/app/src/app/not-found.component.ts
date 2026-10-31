import { ChangeDetectionStrategy, Component, inject, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  constructor() {
    // When server-side rendering, answer with a real 404 status.
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 404;
  }
}
