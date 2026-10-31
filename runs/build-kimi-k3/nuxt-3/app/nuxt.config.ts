// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Origin of the PokeAPI server. The same URL is reachable from the browser.
      apiBaseUrl: (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, ''),
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
    },
  },
})
