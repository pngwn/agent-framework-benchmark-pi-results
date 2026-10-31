import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NotFoundPage } from './lib/NotFoundPage'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => <NotFoundPage />,
  })
  return router
}
