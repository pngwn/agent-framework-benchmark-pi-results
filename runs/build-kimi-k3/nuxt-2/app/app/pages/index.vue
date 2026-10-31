<script setup lang="ts">
useHead({ title: 'Pokédex' })

const PAGE_SIZE = 48

const route = useRoute()
const router = useRouter()
const { data: dex } = await useFetch('/api/dex')

const queryString = (v: unknown): string =>
  typeof v === 'string' ? v : Array.isArray(v) ? String(v[0] ?? '') : ''

// The search box is a local ref (for immediate filtering) synced to the URL
// with a debounce.
const search = ref(queryString(route.query.q))
const currentType = computed(() => queryString(route.query.type))
const currentGeneration = computed(() => queryString(route.query.generation))
const currentPage = computed(() => {
  const n = Number.parseInt(queryString(route.query.page), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

watch(
  () => route.query.q,
  (v) => {
    const s = queryString(v)
    if (s !== search.value) search.value = s
  },
)

function buildQuery(overrides: { q?: string; type?: string; generation?: string; page?: number } = {}) {
  const q = overrides.q ?? search.value
  const type = overrides.type ?? currentType.value
  const generation = overrides.generation ?? currentGeneration.value
  const page = overrides.page ?? currentPage.value
  const query: Record<string, string> = {}
  if (q) query.q = q
  if (type) query.type = type
  if (generation) query.generation = generation
  if (page > 1) query.page = String(page)
  return query
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (queryString(route.query.q) !== v) {
      router.replace({ query: buildQuery({ q: v, page: 1 }) })
    }
  }, 300)
})

function onTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.push({ query: buildQuery({ type: value, page: 1 }) })
}

function onGenerationChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.push({ query: buildQuery({ generation: value, page: 1 }) })
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const type = currentType.value
  const generation = currentGeneration.value
  return (dex.value?.species ?? []).filter((s: any) => {
    if (q && !humanize(s.name).toLowerCase().includes(q)) return false
    if (type && !s.types.includes(type)) return false
    if (generation && s.generation !== generation) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const page = computed(() => Math.min(currentPage.value, totalPages.value))
const pageItems = computed(() =>
  filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)
</script>

<template>
  <div>
    <h1>Pokémon</h1>

    <form class="controls" @submit.prevent>
      <div class="field">
        <label for="search">Search</label>
        <input id="search" v-model="search" type="search" autocomplete="off">
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" :value="currentType" @change="onTypeChange">
          <option value="">All types</option>
          <option v-for="t in dex?.types ?? []" :key="t.name" :value="t.name">{{ t.label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" :value="currentGeneration" @change="onGenerationChange">
          <option value="">All generations</option>
          <option v-for="g in dex?.generations ?? []" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
    </form>

    <p class="count">{{ filtered.length }} Pokémon</p>

    <template v-if="pageItems.length">
      <ul class="card-grid">
        <li v-for="s in pageItems" :key="s.id">
          <PokemonCard :id="s.id" :name="s.name" :types="s.types" />
        </li>
      </ul>
      <nav class="pagination" aria-label="Pagination">
        <span class="page-status">Page {{ page }} of {{ totalPages }}</span>
        <NuxtLink v-if="page > 1" :to="{ query: buildQuery({ page: page - 1 }) }">Previous page</NuxtLink>
        <NuxtLink v-if="page < totalPages" :to="{ query: buildQuery({ page: page + 1 }) }">Next page</NuxtLink>
      </nav>
    </template>
    <p v-else>No Pokémon found</p>
  </div>
</template>
