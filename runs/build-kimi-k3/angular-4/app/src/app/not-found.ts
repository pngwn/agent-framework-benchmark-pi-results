import { Component } from '@angular/core';
import { NotFoundView } from './not-found-view';

/** Catch-all route for URLs that don't match any page. */
@Component({
  imports: [NotFoundView],
  template: `<app-not-found-view />`,
})
export class NotFound {}
