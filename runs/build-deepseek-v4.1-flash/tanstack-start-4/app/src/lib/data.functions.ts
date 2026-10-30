import { createServerFn } from '@tanstack/react-start'
import {
  loadAbilityPage,
  loadHome,
  loadMovePage,
  loadPokemonPage,
  loadTypeList,
  loadTypePage,
} from './api.server'

export const getHomeData = createServerFn({ method: 'GET' })
  .validator((data: { q?: string; type?: string; generation?: string; page?: number }) => data)
  .handler(async ({ data }) => loadHome(data))

export const getPokemonData = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => data)
  .handler(async ({ data }) => loadPokemonPage(data.name, data.game))

export const getMoveData = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => loadMovePage(data.name))

export const getAbilityData = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => loadAbilityPage(data.name))

export const getTypeListData = createServerFn({ method: 'GET' }).handler(async () =>
  loadTypeList(),
)

export const getTypeData = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => loadTypePage(data.name))
