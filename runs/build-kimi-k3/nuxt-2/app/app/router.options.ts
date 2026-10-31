import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 0 }
    // Keep the scroll position when only the query changes (filters, paging).
    if (to.path === from.path) return false
    return { top: 0 }
  },
}
