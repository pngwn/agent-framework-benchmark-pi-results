import { InjectionToken } from '@angular/core';

declare global {
  // Injected by the server (and by /runtime-config.js in the browser).
  var __API_BASE_URL__: string | undefined;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const configured =
      typeof globalThis.__API_BASE_URL__ === 'string' && globalThis.__API_BASE_URL__.length > 0
        ? globalThis.__API_BASE_URL__
        : 'http://localhost:9000';
    return configured.replace(/\/+$/, '');
  },
});
