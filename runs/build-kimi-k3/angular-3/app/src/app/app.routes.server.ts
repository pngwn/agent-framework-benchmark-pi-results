import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Render everything on the server at request time; never at build time.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
