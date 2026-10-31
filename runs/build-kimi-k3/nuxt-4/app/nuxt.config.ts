// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/tokens.css', '~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Pokédex',
    },
  },
  runtimeConfig: {
    public: {
      // Origin of the PokeAPI server. Overridden at runtime by the API_BASE_URL
      // env var (see useApiBase).
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:9000',
    },
  },
})
