<template>
  <div class="list-page">
    <h1>Pokémon</h1>

    <form class="filters" role="search" @submit.prevent>
      <div class="field search-field">
        <label for="search">Search</label>
        <input
          id="search"
          v-model="searchText"
          type="search"
          autocomplete="off"
          @input="onSearchInput"
        />
      </div>
      <div class="field">
        <label for="type-filter">Type</label>
        <select id="type-filter" v-model="typeValue" @change="onFilterChange">
          <option value="">All types</option>
          <option v-for="type in types" :key="type.name" :value="type.name">{{ type.english }}</option>
        </select>
      </div>
      <div class="field">
        <label for="generation-filter">Generation</label>
        <select id="generation-filter" v-model="generationValue" @change="onFilterChange">
          <option value="">All generations</option>
          <option v-for="generation in generations" :key="generation.name" :value="generation.name">
            {{ generation.english }}
          </option>
        </select>
      </div>
    </form>

    <p v-if="filtered.length" class="result-count">{{ filtered.length }} Pokémon</p>

    <ul v-if="filtered.length" class="card-grid">
      <PokemonCard
        v-for="pokemon in pagedPokemon"
        :key="pokemon.speciesName"
        :pokemon="pokemon"
        show-types
      />
    </ul>
    <p v-else class="empty-message">No Pokémon found</p>

    <div v-if="filtered.length" class="pagination">
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <NuxtLink v-if="currentPage > 1" :to="pageUrl(currentPage - 1)">Previous page</NuxtLink>
      <NuxtLink v-if="currentPage < totalPages" :to="pageUrl(currentPage + 1)">Next page</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

definePageMeta({})

useHead({ title: 'Pokédex' })

const route = useRoute()
const router = useRouter()
const { data } = await useFetch<any>('/api/pokedex')

const pokemon = computed<any[]>(() => data.value?.pokemon || [])
const types = computed<any[]>(() => data.value?.types || [])
const generations = computed<any[]>(() => data.value?.generations || [])

const pageSize = 48
const parsePage = (value: any) => {
  const number = Number.parseInt(String(value ?? '1'), 10)
  return Number.isFinite(number) && number > 0 ? number : 1
}

const searchText = ref(String(route.query.q ?? ''))
const typeValue = ref(String(route.query.type ?? ''))
const generationValue = ref(String(route.query.generation ?? ''))
const pageValue = ref(parsePage(route.query.page))

const filtered = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  return pokemon.value.filter((entry) => {
    if (query && !String(entry.name).toLowerCase().includes(query)) return false
    if (typeValue.value && !entry.types?.some((type: any) => type.name === typeValue.value)) return false
    if (generationValue.value && entry.generation !== generationValue.value) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const currentPage = computed(() => Math.min(Math.max(1, pageValue.value), totalPages.value))
const pagedPokemon = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

function queryObject(page = 1) {
  const query: Record<string, string> = {}
  const q = searchText.value.trim()
  if (q) query.q = q
  if (typeValue.value) query.type = typeValue.value
  if (generationValue.value) query.generation = generationValue.value
  if (page > 1) query.page = String(page)
  return query
}

function pageUrl(page: number) {
  const query = queryObject(page)
  return Object.keys(query).length ? `/?${searchString(query)}` : '/'
}

function searchString(query: Record<string, string>) {
  return Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

function replaceUrl(page = 1) {
  return router.replace({ path: '/', query: queryObject(page) })
}

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  pageValue.value = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchTimer = null
    replaceUrl(1)
  }, 200)
}

function onFilterChange() {
  pageValue.value = 1
  replaceUrl(1)
}

watch(
  () => route.query,
  (query) => {
    const q = String(query.q ?? '')
    if (q.toLowerCase() !== searchText.value.toLowerCase()) searchText.value = q
    const type = String(query.type ?? '')
    if (type !== typeValue.value) typeValue.value = type
    const generation = String(query.generation ?? '')
    if (generation !== generationValue.value) generationValue.value = generation
    const page = parsePage(query.page)
    if (page !== pageValue.value) pageValue.value = page
  },
  { deep: true },
)

watch(totalPages, (pages) => {
  if (pageValue.value > pages) pageValue.value = pages
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>
