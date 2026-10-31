import { createServerFn } from '@tanstack/react-start'
import {
  getAbilityPage,
  getHomeData,
  getMovePage,
  getPokemonPage,
  getTypeListPage,
  getTypePage,
} from './pokeapi'

export const fetchHomeData = createServerFn({ method: 'GET' }).handler(() => getHomeData())

export const fetchPokemonPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => data)
  .handler(({ data }) => getPokemonPage(data.name, data.game))

export const fetchMovePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => getMovePage(data.name))

export const fetchAbilityPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => getAbilityPage(data.name))

export const fetchTypeList = createServerFn({ method: 'GET' }).handler(() => getTypeListPage())

export const fetchTypePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => getTypePage(data.name))
