import { InjectionToken, makeStateKey } from '@angular/core';

/** Origin of the PokeAPI server (e.g. http://localhost:9000), without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** TransferState key used to hand the API origin from the server render to the browser. */
export const API_BASE_KEY = makeStateKey<string>('pokedex-api-base-url');
