import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/** Shared "Not found" content: heading plus a link back home. */
@Component({
  selector: 'app-not-found-view',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFoundView {}

/**
 * Marks the current page as "not found": sets the document title and, during
 * SSR, responds with HTTP 404. Must be called in an injection context.
 */
export function applyNotFound(title: Title): void {
  title.setTitle('Not found – Pokédex');
  const responseInit = inject(RESPONSE_INIT, { optional: true });
  if (responseInit) responseInit.status = 404;
}

/** Catch-all route page. */
@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundView],
  template: `<app-not-found-view />`,
})
export class NotFoundPage {
  constructor() {
    applyNotFound(inject(Title));
  }
}
