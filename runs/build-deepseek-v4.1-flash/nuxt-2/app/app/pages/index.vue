<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()

const qParam = computed(() => typeof route.query.q === 'string' ? route.query.q : '')
const typeParam = computed(() => typeof route.query.type === 'string' ? route.query.type : '')
const generationParam = computed(() => typeof route.query.generation === 'string' ? route.query.generation : '')
const pageParam = computed(() => {
  const page = Number(route.query.page)
  return Number.isInteger(page) && page > 0 ? page : 1
})

const searchInput = ref(qParam.value)
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(qParam, (value) => {
  if (value !== searchInput.value) searchInput.value = value
})

function queryFor(overrides: Record<string, string | number | undefined> = {}) {
  const values: Record<string, string | number | undefined> = {
    q: qParam.value,
    type: typeParam.value,
    generation: generationParam.value,
    page: pageParam.value,
    ...overrides,
  }
  if ('q' in overrides || 'type' in overrides || 'generation' in overrides) values.page = 1

  const query: Record<string, string> = {}
  const search = String(values.q ?? '').trim()
  if (search) query.q = search
  if (values.type) query.type = String(values.type)
  if (values.generation) query.generation = String(values.generation)
  if (Number(values.page) > 1) query.page = String(values.page)
  return query
}

function updateQuery(overrides: Record<string, string | number | undefined>) {
  router.replace({ path: '/', query: queryFor(overrides) })
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => updateQuery({ q: searchInput.value }), 200)
}

function onTypeChange(event: Event) {
  updateQuery({ type: (event.target as HTMLSelectElement).value })
}

function onGenerationChange(event: Event) {
  updateQuery({ generation: (event.target as HTMLSelectElement).value })
}

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const { data } = await useFetch('/api/home', {
  query: computed(() => ({
    q: qParam.value || undefined,
    type: typeParam.value || undefined,
    generation: generationParam.value || undefined,
    page: pageParam.value,
  })),
})

const count = computed(() => data.value?.count ?? 0)
const totalPages = computed(() => data.value?.totalPages ?? 1)
const page = computed(() => data.value?.page ?? 1)
const cards = computed(() => data.value?.cards ?? [])

function pageLink(target: number) {
  return { path: '/', query: queryFor({ page: target }) }
}

useHead({
  title: 'Pokédex',
})
</script>

<template>
  <div class="home-page">
    <h1 class="page-title">Pokémon</h1>

    <div class="home-controls">
      <div class="field field--search">
        <label for="search">Search</label>
        <input
          id="search"
          v-model="searchInput"
          type="search"
          autocomplete="off"
          @input="onSearch"
        >
      </div>
      <div class="field">
        <label for="type-filter">Type</label>
        <select id="type-filter" :value="typeParam" @change="onTypeChange">
          <option value="">All types</option>
          <option v-for="type in data?.typeOptions ?? []" :key="type.name" :value="type.name">
            {{ type.label }}
          </option>
        </select>
      </div>
      <div class="field">
        <label for="generation-filter">Generation</label>
        <select id="generation-filter" :value="generationParam" @change="onGenerationChange">
          <option value="">All generations</option>
          <option v-for="generation in data?.generationOptions ?? []" :key="generation.name" :value="generation.name">
            {{ generation.label }}
          </option>
        </select>
      </div>
    </div>

    <p class="home-count">{{ count }} Pokémon</p>

    <template v-if="count > 0">
      <PokemonGrid :cards="cards" />

      <nav class="pagination" aria-label="Pagination">
        <NuxtLink v-if="page > 1" :to="pageLink(page - 1)">Previous page</NuxtLink>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <NuxtLink v-if="page < totalPages" :to="pageLink(page + 1)">Next page</NuxtLink>
      </nav>
    </template>
    <p v-else class="empty-result">No Pokémon found</p>
  </div>
</template>
