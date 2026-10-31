import { Component } from '@angular/core';
import { NotFoundView } from './not-found-view';

@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundView],
  template: `<app-not-found-view />`,
})
export class NotFoundPage {}
