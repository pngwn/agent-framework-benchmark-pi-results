import { createServerFn } from '@tanstack/react-start'
import {
  loadAbilityPage,
  loadHomeData,
  loadMovePage,
  loadPokemonPage,
  loadTypeList,
  loadTypePage,
} from './data.server'

export const getHomeData = createServerFn({ method: 'GET' }).handler(() => loadHomeData())

export const getPokemonPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => data)
  .handler(({ data }) => loadPokemonPage(data.name, data.game))

export const getMovePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => loadMovePage(data.name))

export const getAbilityPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => loadAbilityPage(data.name))

export const getTypeList = createServerFn({ method: 'GET' }).handler(() => loadTypeList())

export const getTypePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => loadTypePage(data.name))
