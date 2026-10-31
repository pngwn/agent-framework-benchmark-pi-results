// Makes API_BASE_URL (a runtime env var) available to the browser through the
// public runtime config that is serialized into each page's payload.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  config.public.apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')
})
