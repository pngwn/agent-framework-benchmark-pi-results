// Server functions: all page data is fetched from the API on the server.

import { createServerFn } from '@tanstack/react-start'
import {
  buildAbilityPage,
  buildHomeData,
  buildMovePage,
  buildPokemonPage,
  buildTypeList,
  buildTypePage,
} from './data'

export const getHomeData = createServerFn({ method: 'GET' }).handler(() => buildHomeData())

export const getPokemonPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => data)
  .handler(({ data }) => buildPokemonPage(data.name, data.game))

export const getMovePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => buildMovePage(data.name))

export const getAbilityPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => buildAbilityPage(data.name))

export const getTypeList = createServerFn({ method: 'GET' }).handler(() => buildTypeList())

export const getTypePage = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) => buildTypePage(data.name))
