// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  telemetry: false,
  css: ['~/assets/tokens.css', '~/assets/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Pokédex',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  runtimeConfig: {
    public: {
      // Overridden at runtime from API_BASE_URL (see the `start` script).
      apiBase: 'http://localhost:9000',
    },
  },
});
