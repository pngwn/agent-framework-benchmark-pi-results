export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Pokédex',
    },
  },
  nitro: {
    preset: 'node-server',
  },
  compatibilityDate: '2025-07-15',
})
