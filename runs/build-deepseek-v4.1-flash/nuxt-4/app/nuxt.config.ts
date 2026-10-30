export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  ssr: true,
  css: ['~/assets/css/main.css'],
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
  nitro: {
    preset: 'node-server',
  },
})
