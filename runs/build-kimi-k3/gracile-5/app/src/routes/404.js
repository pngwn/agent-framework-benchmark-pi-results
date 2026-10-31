import { defineRoute } from '@gracile/gracile/route';
import { document } from '../document.js';
import { notFoundTemplate, NOT_FOUND_TITLE } from '../lib/views.js';

export default defineRoute({
  document: (context) => document({ ...context, title: NOT_FOUND_TITLE }),
  template: () => notFoundTemplate(),
});
