import { RenderMode, ServerRoute } from '@angular/ssr';

// All pages are server-rendered at request time so they always reflect the
// live API data (no build-time prerendering of API content).
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
