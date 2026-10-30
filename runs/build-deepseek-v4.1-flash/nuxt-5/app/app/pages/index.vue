<template>
  <div class="home-page">
    <h1>Pokémon</h1>

    <form class="filters" role="search" @submit.prevent>
      <div class="field field--search">
        <label for="pokemon-search">Search</label>
        <input id="pokemon-search" v-model="search" type="search" autocomplete="off">
      </div>
      <div class="field">
        <label for="pokemon-type">Type</label>
        <select id="pokemon-type" :value="selectedType" @change="changeFilter('type', ($event.target as HTMLSelectElement).value)">
          <option value="">All types</option>
          <option v-for="type in index?.types || []" :key="type.name" :value="type.name">{{ type.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="pokemon-generation">Generation</label>
        <select id="pokemon-generation" :value="selectedGeneration" @change="changeFilter('generation', ($event.target as HTMLSelectElement).value)">
          <option value="">All generations</option>
          <option v-for="generation in index?.generations || []" :key="generation.name" :value="generation.name">{{ generation.label }}</option>
        </select>
      </div>
    </form>

    <p class="result-count">{{ filteredSpecies.length }} Pokémon</p>

    <template v-if="filteredSpecies.length">
      <ul class="card-grid">
        <PokemonCard
          v-for="pokemon in visibleSpecies"
          :key="pokemon.id"
          :pokemon="pokemon"
          show-types
        />
      </ul>

      <nav class="pagination" aria-label="Pagination">
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <NuxtLink v-if="currentPage > 1" :to="pageLink(currentPage - 1)">Previous page</NuxtLink>
        <NuxtLink v-if="currentPage < totalPages" :to="pageLink(currentPage + 1)">Next page</NuxtLink>
      </nav>
    </template>
    <p v-else class="empty-message">No Pokémon found</p>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Pokédex' })

const route = useRoute()
const router = useRouter()
const { data: index } = await useAsyncData('dex-index', () => $fetch('/api/app/dex'))

const pageSize = 48
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')

const selectedType = computed(() => typeof route.query.type === 'string' ? route.query.type : '')
const selectedGeneration = computed(() => typeof route.query.generation === 'string' ? route.query.generation : '')

const filteredSpecies = computed(() => {
  let species = index.value?.species || []
  const query = search.value.trim().toLowerCase()
  if (query) species = species.filter((entry: any) => entry.displayName.toLowerCase().includes(query))
  if (selectedType.value) species = species.filter((entry: any) => entry.types?.some((type: any) => type.name === selectedType.value))
  if (selectedGeneration.value) {
    species = species.filter((entry: any) => entry.generation?.name === selectedGeneration.value)
  }
  return species
})

const requestedPage = computed(() => {
  const value = typeof route.query.page === 'string' ? Number(route.query.page) : 1
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSpecies.value.length / pageSize)))
const currentPage = computed(() => Math.min(requestedPage.value, totalPages.value))
const visibleSpecies = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredSpecies.value.slice(start, start + pageSize)
})

function filterQuery() {
  const query: Record<string, string> = {}
  const trimmed = search.value.trim()
  if (trimmed) query.q = trimmed
  if (selectedType.value) query.type = selectedType.value
  if (selectedGeneration.value) query.generation = selectedGeneration.value
  return query
}

function pageLink(page: number) {
  return { path: '/', query: page > 1 ? { ...filterQuery(), page: String(page) } : filterQuery() }
}

function changeFilter(key: 'type' | 'generation', value: string) {
  const query = filterQuery()
  if (value) query[key] = value
  else delete query[key]
  router.push({ path: '/', query })
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const query = filterQuery()
    const same = Object.keys(query).every((key) => route.query[key] === query[key])
      && Object.keys(route.query).every((key) => key === 'page' || Object.prototype.hasOwnProperty.call(query, key))
    if (!same) router.replace({ path: '/', query })
  }, 250)
})

watch(() => route.query.q, (value) => {
  const next = typeof value === 'string' ? value : ''
  if (next !== search.value) search.value = next
})
</script>
