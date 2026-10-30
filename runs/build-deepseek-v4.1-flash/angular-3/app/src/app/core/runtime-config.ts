interface PokedexRuntimeConfig {
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    __POKEDEX_CONFIG__?: PokedexRuntimeConfig;
  }
}

export function apiBaseUrl(): string {
  const configured = typeof window === 'undefined' ? undefined : window.__POKEDEX_CONFIG__?.apiBaseUrl;
  const base = configured && !configured.startsWith('__') ? configured : 'http://localhost:9000';
  return base.replace(/\/$/, '');
}
