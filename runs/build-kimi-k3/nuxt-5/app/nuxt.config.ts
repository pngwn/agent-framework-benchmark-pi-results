// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
    },
  },
  runtimeConfig: {
    public: {
      // Filled in at request time from process.env.API_BASE_URL (see plugins/api-base-url.server.ts)
      apiBaseUrl: '',
    },
  },
})
