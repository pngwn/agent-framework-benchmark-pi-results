import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners, TransferState } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { API_BASE_KEY, API_BASE_URL } from './api-base-url';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    {
      // In the browser the API origin comes from the server render via TransferState.
      provide: API_BASE_URL,
      useFactory: () => inject(TransferState).get(API_BASE_KEY, 'http://localhost:9000'),
    },
  ],
};
