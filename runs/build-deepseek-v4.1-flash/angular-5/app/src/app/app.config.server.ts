import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from './api/api-base-url';

const apiBaseUrl = (process.env['API_BASE_URL'] ?? 'http://localhost:9000').replace(/\/+$/, '');

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE_URL, useValue: apiBaseUrl },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
