import { mergeApplicationConfig, ApplicationConfig, inject, TransferState } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_KEY, API_BASE_URL } from './api-base-url';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      // On the server the API origin comes from the environment; it is handed to the
      // browser through TransferState.
      provide: API_BASE_URL,
      useFactory: () => {
        const base = (process.env['API_BASE_URL'] ?? 'http://localhost:9000').replace(/\/$/, '');
        inject(TransferState).set(API_BASE_KEY, base);
        return base;
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
