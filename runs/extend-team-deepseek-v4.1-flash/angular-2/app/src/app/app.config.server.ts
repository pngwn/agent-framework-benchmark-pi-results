import { ApplicationConfig, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { apiBaseUrl } from '../server/api-client';
import { loadPageData } from '../server/loaders';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { PAGE_DATA_LOADER, publishApiBaseUrl } from './data/page-data';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: PAGE_DATA_LOADER, useValue: loadPageData },
    provideAppInitializer(() => publishApiBaseUrl(apiBaseUrl())),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
