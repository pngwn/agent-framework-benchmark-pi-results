// Capture the API base URL from the runtime config while we are guaranteed to
// have access to the Nuxt instance, so the data layer can use it anywhere.
export default defineNuxtPlugin((nuxtApp) => {
  setApiBase(nuxtApp.$config.public.apiBaseUrl as string)
})
