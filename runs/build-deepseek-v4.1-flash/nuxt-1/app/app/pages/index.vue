<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const { data } = await useFetch<any>('/api/catalog')

useHead({ title: 'Pokédex' })

const catalog = computed(() => data.value || { pokemon: [], types: [], generations: [] })
const search = ref(String(route.query.q ?? ''))
let searchTimer: ReturnType<typeof setTimeout> | undefined

function firstQueryValue(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

const activeType = computed(() => firstQueryValue(route.query.type))
const activeGeneration = computed(() => firstQueryValue(route.query.generation))
const requestedPage = computed(() => {
  const parsed = Number.parseInt(firstQueryValue(route.query.page), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

watch(
  () => route.query.q,
  (value) => {
    const next = firstQueryValue(value)
    if (next !== search.value) search.value = next
  },
)

watch(search, (value) => {
  if (value === firstQueryValue(route.query.q)) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    router.replace({ query: queryFromState({ q: value, type: activeType.value, generation: activeGeneration.value, page: 1 }) })
  }, 250)
})

onBeforeUnmount(() => clearTimeout(searchTimer))

function queryFromState(state: { q?: string; type?: string; generation?: string; page?: number }) {
  const query: Record<string, string> = {}
  const q = (state.q ?? '').trim()
  if (q) query.q = q
  if (state.type) query.type = state.type
  if (state.generation) query.generation = state.generation
  if (state.page && state.page > 1) query.page = String(state.page)
  return query
}

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return catalog.value.pokemon.filter((pokemon: any) => {
    if (query && !pokemon.nameLabel.toLowerCase().includes(query)) return false
    if (activeType.value && !pokemon.types.some((type: any) => type.name === activeType.value)) return false
    if (activeGeneration.value && pokemon.generation !== activeGeneration.value) return false
    return true
  })
})

const pageSize = 48
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const currentPage = computed(() => Math.min(requestedPage.value, totalPages.value))
const visiblePokemon = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

function changeType(event: Event) {
  clearTimeout(searchTimer)
  const value = (event.target as HTMLSelectElement).value
  router.push({
    query: queryFromState({ q: search.value, type: value, generation: activeGeneration.value, page: 1 }),
  })
}

function changeGeneration(event: Event) {
  clearTimeout(searchTimer)
  const value = (event.target as HTMLSelectElement).value
  router.push({
    query: queryFromState({ q: search.value, type: activeType.value, generation: value, page: 1 }),
  })
}

const previousLink = computed(() => ({
  path: '/',
  query: queryFromState({
    q: search.value,
    type: activeType.value,
    generation: activeGeneration.value,
    page: currentPage.value - 1,
  }),
}))
const nextLink = computed(() => ({
  path: '/',
  query: queryFromState({
    q: search.value,
    type: activeType.value,
    generation: activeGeneration.value,
    page: currentPage.value + 1,
  }),
}))
</script>

<template>
  <div class="home-page">
    <h1>Pokémon</h1>

    <div class="filters">
      <div class="field field--search">
        <label for="search">Search</label>
        <input id="search" v-model="search" type="search" autocomplete="off" />
      </div>
      <div class="field">
        <label for="type-filter">Type</label>
        <select id="type-filter" :value="activeType" @change="changeType">
          <option value="">All types</option>
          <option v-for="type in catalog.types" :key="type.name" :value="type.name">{{ type.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="generation-filter">Generation</label>
        <select id="generation-filter" :value="activeGeneration" @change="changeGeneration">
          <option value="">All generations</option>
          <option v-for="generation in catalog.generations" :key="generation.name" :value="generation.name">
            {{ generation.label }}
          </option>
        </select>
      </div>
    </div>

    <p class="result-count">{{ filtered.length }} Pokémon</p>

    <p v-if="filtered.length === 0" class="empty-message">No Pokémon found</p>

    <template v-else>
      <ul class="pokemon-grid">
        <li v-for="pokemon in visiblePokemon" :key="pokemon.id">
          <PokemonCard :pokemon="pokemon" show-types />
        </li>
      </ul>

      <nav class="pagination" aria-label="Pagination">
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <NuxtLink v-if="currentPage > 1" :to="previousLink">Previous page</NuxtLink>
        <NuxtLink v-if="currentPage < totalPages" :to="nextLink">Next page</NuxtLink>
      </nav>
    </template>
  </div>
</template>
