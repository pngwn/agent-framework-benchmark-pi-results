import { Component } from '@angular/core';
import { NotFound } from '../shared/not-found';

@Component({
  selector: 'app-not-found-page',
  imports: [NotFound],
  template: `<app-not-found />`,
})
export class NotFoundPage {}
