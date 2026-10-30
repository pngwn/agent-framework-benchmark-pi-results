export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/tokens.css', '~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Pokédex',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A browsable encyclopedia of Pokémon.' },
      ],
    },
  },
  runtimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:9000',
  },
  nitro: {
    compressPublicAssets: false,
  },
})
