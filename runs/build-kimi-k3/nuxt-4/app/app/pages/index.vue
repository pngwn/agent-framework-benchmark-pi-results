<script setup lang="ts">
import { getIndex } from '~/lib/pokeapi'

useHead({ title: 'Pokédex' })

const route = useRoute()
const router = useRouter()
const base = useApiBase()

const { data: index } = await useAsyncData('pokemon-index', () => getIndex(base))

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
watch(
  () => route.query.q,
  (v) => {
    const s = typeof v === 'string' ? v : ''
    if (s !== q.value) q.value = s
  },
)

const type = computed(() => (typeof route.query.type === 'string' ? route.query.type : ''))
const generation = computed(() => (typeof route.query.generation === 'string' ? route.query.generation : ''))
const page = computed(() => {
  const raw = typeof route.query.page === 'string' ? route.query.page : ''
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

const PAGE_SIZE = 48

const filtered = computed(() => {
  const needle = q.value.trim().toLowerCase()
  return (index.value?.entries ?? []).filter(
    (e) =>
      (!needle || e.human.toLowerCase().includes(needle)) &&
      (!type.value || e.types.some((t) => t.name === type.value)) &&
      (!generation.value || e.generation === generation.value),
  )
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))
const pageItems = computed(() => filtered.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE))

function buildQuery(overrides: { q?: string; type?: string; generation?: string; page?: number }) {
  const merged = {
    q: q.value,
    type: type.value,
    generation: generation.value,
    page: page.value,
    ...overrides,
  }
  const query: Record<string, string> = {}
  if (merged.q) query.q = merged.q
  if (merged.type) query.type = merged.type
  if (merged.generation) query.generation = merged.generation
  if (merged.page > 1) query.page = String(merged.page)
  return query
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(q, (val) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    router.push({ path: '/', query: buildQuery({ q: val, page: 1 }) })
  }, 200)
})

function onTypeChange(event: Event) {
  router.push({ path: '/', query: buildQuery({ type: (event.target as HTMLSelectElement).value, page: 1 }) })
}
function onGenerationChange(event: Event) {
  router.push({ path: '/', query: buildQuery({ generation: (event.target as HTMLSelectElement).value, page: 1 }) })
}

const pageLink = (n: number) => ({ path: '/', query: buildQuery({ page: n }) })
</script>

<template>
  <div>
    <h1>Pokémon</h1>
    <form class="controls" @submit.prevent>
      <div class="field">
        <label for="filter-search">Search</label>
        <input id="filter-search" v-model="q" type="search" autocomplete="off" />
      </div>
      <div class="field">
        <label for="filter-type">Type</label>
        <select id="filter-type" :value="type" @change="onTypeChange">
          <option value="">All types</option>
          <option v-for="t in index?.types ?? []" :key="t.name" :value="t.name">{{ t.english }}</option>
        </select>
      </div>
      <div class="field">
        <label for="filter-generation">Generation</label>
        <select id="filter-generation" :value="generation" @change="onGenerationChange">
          <option value="">All generations</option>
          <option v-for="g in index?.generations ?? []" :key="g.name" :value="g.name">{{ g.english }}</option>
        </select>
      </div>
    </form>

    <p class="result-count">{{ filtered.length }} Pokémon</p>

    <p v-if="!pageItems.length" class="empty">No Pokémon found</p>
    <template v-else>
      <ul class="card-grid">
        <PokemonCard v-for="e in pageItems" :key="e.id" :id="e.id" :name="e.name" :human="e.human" :types="e.types" />
      </ul>
      <div class="pagination">
        <span class="page-status">Page {{ currentPage }} of {{ pageCount }}</span>
        <NuxtLink v-if="currentPage > 1" :to="pageLink(currentPage - 1)">Previous page</NuxtLink>
        <NuxtLink v-if="currentPage < pageCount" :to="pageLink(currentPage + 1)">Next page</NuxtLink>
      </div>
    </template>
  </div>
</template>
