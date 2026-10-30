<script setup lang="ts">
useHead({ title: 'Pokédex' })

const route = useRoute()
const router = useRouter()
const { data: catalogData } = await useAsyncData('catalog', () =>
  $fetch('/api/catalog'),
)

const catalog = computed<any>(() => catalogData.value ?? {
  types: [],
  generations: [],
  versionGroups: [],
  species: [],
})

const typeLookup = computed<Record<string, { name: string; label: string }>>(
  () =>
    Object.fromEntries(
      (catalog.value.types ?? []).map((type: any) => [
        type.name,
        { name: type.name, label: type.englishName },
      ]),
    ),
)

const queryValue = (key: string) => {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

const search = ref(queryValue('q'))
const typeFilter = computed(() => queryValue('type'))
const generationFilter = computed(() => queryValue('generation'))

watch(
  () => queryValue('q'),
  (value) => {
    if (value !== search.value) search.value = value
  },
)

const matching = computed(() => {
  const query = search.value.trim().toLowerCase()
  const type = typeFilter.value
  const generation = generationFilter.value

  return (catalog.value.species ?? []).filter((species: any) => {
    if (
      query &&
      !humanize(species.name).toLowerCase().includes(query)
    ) {
      return false
    }
    if (type && !species.types?.some((entry: any) => entry.name === type)) {
      return false
    }
    if (generation && species.generation !== generation) {
      return false
    }
    return true
  })
})

const pageSize = 48
const totalPages = computed(() =>
  Math.max(1, Math.ceil(matching.value.length / pageSize)),
)
const currentPage = computed(() => {
  const parsed = Number.parseInt(queryValue('page'), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(parsed, totalPages.value)
})
const visiblePokemon = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return matching.value.slice(start, start + pageSize).map((species: any) => ({
    ...species,
    humanized: humanize(species.name),
  }))
})

function createQuery(
  overrides: {
    q?: string
    type?: string
    generation?: string
    page?: number
  } = {},
) {
  const query: Record<string, string> = {}
  const q = overrides.q ?? queryValue('q')
  const type = overrides.type ?? queryValue('type')
  const generation = overrides.generation ?? queryValue('generation')
  const page = overrides.page ?? currentPage.value

  if (q.trim()) query.q = q.trim()
  if (type) query.type = type
  if (generation) query.generation = generation
  if (page > 1) query.page = String(page)
  return query
}

function navigate(overrides: Parameters<typeof createQuery>[0]) {
  return router.push({ path: '/', query: createQuery(overrides) })
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    navigate({ q: search.value, page: 1 })
  }, 150)
}

function onTypeChange(event: Event) {
  navigate({
    type: (event.target as HTMLSelectElement).value,
    page: 1,
  })
}

function onGenerationChange(event: Event) {
  navigate({
    generation: (event.target as HTMLSelectElement).value,
    page: 1,
  })
}

const pageLink = (page: number) => ({
  path: '/',
  query: createQuery({ page }),
})
</script>

<template>
  <div class="page home-page">
    <h1>Pokémon</h1>

    <div class="filters">
      <div class="field field-search">
        <label for="pokemon-search">Search</label>
        <input
          id="pokemon-search"
          v-model="search"
          type="search"
          autocomplete="off"
          @input="scheduleSearch"
        >
      </div>

      <div class="field">
        <label for="type-filter">Type</label>
        <select id="type-filter" :value="typeFilter" @change="onTypeChange">
          <option value="">All types</option>
          <option
            v-for="type in catalog.types"
            :key="type.name"
            :value="type.name"
          >{{ type.englishName }}</option>
        </select>
      </div>

      <div class="field">
        <label for="generation-filter">Generation</label>
        <select
          id="generation-filter"
          :value="generationFilter"
          @change="onGenerationChange"
        >
          <option value="">All generations</option>
          <option
            v-for="generation in catalog.generations"
            :key="generation.name"
            :value="generation.name"
          >{{ generation.englishName }}</option>
        </select>
      </div>
    </div>

    <p class="result-count">{{ matching.length }} Pokémon</p>

    <template v-if="matching.length">
      <PokemonCardList
        :pokemon="visiblePokemon"
        types
        :type-lookup="typeLookup"
      />

      <div class="pagination">
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <NuxtLink
          v-if="currentPage > 1"
          :to="pageLink(currentPage - 1)"
          class="page-link"
        >Previous page</NuxtLink>
        <NuxtLink
          v-if="currentPage < totalPages"
          :to="pageLink(currentPage + 1)"
          class="page-link"
        >Next page</NuxtLink>
      </div>
    </template>

    <p v-else class="empty-message">No Pokémon found</p>
  </div>
</template>
