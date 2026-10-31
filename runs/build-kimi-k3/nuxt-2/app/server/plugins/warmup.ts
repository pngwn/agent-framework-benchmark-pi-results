export default defineNitroPlugin(() => {
  // Warm the species index in the background so the first request is fast.
  getIndex().catch(() => {})
})
