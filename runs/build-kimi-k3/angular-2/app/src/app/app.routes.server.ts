import { RenderMode, ServerRoute } from '@angular/ssr';

// Every page reads live API data, so everything is server-rendered at request time.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
