import { createServerFn } from '@tanstack/react-start'
import {
  getAbilityPage,
  getHomeData,
  getMovePage,
  getPokemonPage,
  getTypeList,
  getTypePage,
} from './pokedex.server'

export const loadHome = createServerFn({ method: 'GET' }).handler(async () => {
  return getHomeData()
})

export const loadPokemon = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => data)
  .handler(async ({ data }) => {
    return getPokemonPage(data.name, data.game)
  })

export const loadMove = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return getMovePage(data.name)
  })

export const loadAbility = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return getAbilityPage(data.name)
  })

export const loadTypes = createServerFn({ method: 'GET' }).handler(async () => {
  return getTypeList()
})

export const loadType = createServerFn({ method: 'GET' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return getTypePage(data.name)
  })
