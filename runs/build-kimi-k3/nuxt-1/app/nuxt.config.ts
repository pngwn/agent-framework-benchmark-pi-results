// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  telemetry: false,
  ssr: true,
  css: ['~/assets/css/tokens.css', '~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
    },
  },
  runtimeConfig: {
    public: {
      // Origin of the PokeAPI server. The browser can reach the API at this same URL.
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:9000',
    },
  },
})
