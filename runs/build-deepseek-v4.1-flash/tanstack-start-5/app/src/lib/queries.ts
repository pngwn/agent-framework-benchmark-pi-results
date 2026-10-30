import { createServerFn } from '@tanstack/react-start'
import {
  getAbilityPageData,
  getHomeData,
  getMovePageData,
  getPokemonPageData,
  getTypeListData,
  getTypePageData,
  type HomeFilters,
} from './data.server'

export const loadHomePage = createServerFn({ method: 'GET' })
  .validator((data: HomeFilters) => data)
  .handler(async ({ data }) => getHomeData(data))

export const loadPokemonPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game: string }) => data)
  .handler(async ({ data }) => getPokemonPageData(data.name, data.game))

export const loadMovePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => getMovePageData(data.name))

export const loadAbilityPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => getAbilityPageData(data.name))

export const loadTypeListPage = createServerFn({ method: 'GET' }).handler(async () =>
  getTypeListData(),
)

export const loadTypePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => getTypePageData(data.name))
