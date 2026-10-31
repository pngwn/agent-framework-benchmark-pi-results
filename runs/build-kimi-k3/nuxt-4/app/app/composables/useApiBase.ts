/** Origin of the PokeAPI server, resolved at request time from API_BASE_URL. */
export function useApiBase(): string {
  const state = useState<string>('api-base-url', () => useRuntimeConfig().public.apiBaseUrl as string)
  if (import.meta.server && process.env.API_BASE_URL) {
    state.value = process.env.API_BASE_URL.replace(/\/$/, '')
  }
  return state.value
}
