import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  API_BASE_URL: {
    description: 'Origin of the PokeAPI server the app fetches its data from.',
    // read when the app runs, not inlined at build time
    static: false,
    schema: (value) => value || 'http://localhost:9000'
  }
});
