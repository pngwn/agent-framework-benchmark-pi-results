// Server functions called from route loaders. They always execute on the
// server, where API responses are cached in memory.

import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { ApiError } from './api'
import {
  buildAbilityPageData,
  buildHomeData,
  buildMovePageData,
  buildPokemonPageData,
  buildTypeListData,
  buildTypePageData,
} from './data'

async function withNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw notFound()
    throw err
  }
}

export const getHomeData = createServerFn({ method: 'GET' }).handler(() =>
  withNotFound(() => buildHomeData()),
)

export const getPokemonPageData = createServerFn({ method: 'GET' })
  .validator((input: { name: string; game?: string }) => ({
    name: String(input?.name ?? ''),
    game: typeof input?.game === 'string' ? input.game : undefined,
  }))
  .handler(({ data }) => withNotFound(() => buildPokemonPageData(data.name, data.game)))

export const getMovePageData = createServerFn({ method: 'GET' })
  .validator((input: { name: string }) => ({ name: String(input?.name ?? '') }))
  .handler(({ data }) => withNotFound(() => buildMovePageData(data.name)))

export const getAbilityPageData = createServerFn({ method: 'GET' })
  .validator((input: { name: string }) => ({ name: String(input?.name ?? '') }))
  .handler(({ data }) => withNotFound(() => buildAbilityPageData(data.name)))

export const getTypeListData = createServerFn({ method: 'GET' }).handler(() =>
  withNotFound(() => buildTypeListData()),
)

export const getTypePageData = createServerFn({ method: 'GET' })
  .validator((input: { name: string }) => ({ name: String(input?.name ?? '') }))
  .handler(({ data }) => withNotFound(() => buildTypePageData(data.name)))
