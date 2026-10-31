const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    apiBaseUrl,
    public: {
      apiBaseUrl,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Pokédex',
    },
  },

  // The app reads live data from the API on every request; never prerender.
  routeRules: {
    '/**': { prerender: false },
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
    },
  },
})
