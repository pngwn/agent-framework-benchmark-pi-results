import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './app.routes';
import { PageTitleStrategy } from './page-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Scrolling is handled by App, which keeps the position for in-page query changes.
      withInMemoryScrolling({ scrollPositionRestoration: 'disabled', anchorScrolling: 'disabled' }),
    ),
    provideClientHydration(withEventReplay()),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
