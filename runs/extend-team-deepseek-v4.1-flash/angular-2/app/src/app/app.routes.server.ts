import { RenderMode, ServerRoute } from '@angular/ssr';

// Every page shows live API data, so everything is rendered per request (never prerendered).
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
