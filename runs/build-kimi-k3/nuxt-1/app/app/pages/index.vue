<script setup>
import { humanize } from '#shared/utils/format'

useHead({ title: 'Pokédex' })

const PAGE_SIZE = 48

const route = useRoute()
const router = useRouter()

const { data } = await useFetch('/api/pokedex')

const queryString = (v) => (Array.isArray(v) ? v[0] : typeof v === 'string' ? v : '')

// Filter state lives in the URL query; the search box mirrors it with a local ref
// so results update on every keystroke.
const q = ref(queryString(route.query.q))
const type = computed(() => queryString(route.query.type))
const generation = computed(() => queryString(route.query.generation))
const pageParam = computed(() => Math.max(1, parseInt(queryString(route.query.page), 10) || 1))

const filtered = computed(() => {
  let list = data.value?.species ?? []
  const needle = q.value.trim().toLowerCase()
  if (needle) list = list.filter((s) => s.label.toLowerCase().includes(needle))
  if (type.value) list = list.filter((s) => s.types.includes(type.value))
  if (generation.value) list = list.filter((s) => s.generation === generation.value)
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const currentPage = computed(() => Math.min(pageParam.value, totalPages.value))
const pageItems = computed(() =>
  filtered.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE),
)

const typeLabel = computed(() => new Map((data.value?.types ?? []).map((t) => [t.name, t.en])))
const cardTypes = (s) => s.types.map((n) => ({ name: n, en: typeLabel.value.get(n) ?? humanize(n) }))

function buildQuery(overrides = {}) {
  const qv = ('q' in overrides ? overrides.q : q.value).trim()
  const tv = 'type' in overrides ? overrides.type : type.value
  const gv = 'generation' in overrides ? overrides.generation : generation.value
  const pv = 'page' in overrides ? overrides.page : currentPage.value
  const query = {}
  if (qv) query.q = qv
  if (tv) query.type = tv
  if (gv) query.generation = gv
  if (pv > 1) query.page = String(pv)
  return query
}

let debounceTimer
watch(q, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    router.replace({ query: buildQuery({ q: value, page: 1 }) })
  }, 250)
})

// Keep the search box in sync when the URL changes (history navigation, links).
watch(
  () => route.query.q,
  (value) => {
    const s = queryString(value)
    if (s !== q.value) q.value = s
  },
)

function onTypeChange(event) {
  router.push({ query: buildQuery({ type: event.target.value, page: 1 }) })
}

function onGenerationChange(event) {
  router.push({ query: buildQuery({ generation: event.target.value, page: 1 }) })
}
</script>

<template>
  <div>
    <h1 class="page-title">Pokémon</h1>

    <form class="filters" @submit.prevent>
      <div class="field">
        <label for="filter-search">Search</label>
        <input id="filter-search" v-model="q" type="search" autocomplete="off" />
      </div>
      <div class="field">
        <label for="filter-type">Type</label>
        <select id="filter-type" :value="type" @change="onTypeChange">
          <option value="">All types</option>
          <option v-for="t in data?.types ?? []" :key="t.name" :value="t.name">{{ t.en }}</option>
        </select>
      </div>
      <div class="field">
        <label for="filter-generation">Generation</label>
        <select id="filter-generation" :value="generation" @change="onGenerationChange">
          <option value="">All generations</option>
          <option v-for="g in data?.generations ?? []" :key="g.name" :value="g.name">{{ g.en }}</option>
        </select>
      </div>
    </form>

    <p class="result-count">{{ filtered.length }} Pokémon</p>

    <p v-if="!filtered.length" class="empty-state">No Pokémon found</p>
    <template v-else>
      <ul class="card-grid">
        <PokemonCard
          v-for="s in pageItems"
          :key="s.id"
          :id="s.id"
          :name="s.name"
          :label="s.label"
          :sprite="s.sprite"
          :types="cardTypes(s)"
        />
      </ul>
      <div class="pagination">
        <NuxtLink v-if="currentPage > 1" :to="{ query: buildQuery({ page: currentPage - 1 }) }">
          Previous page
        </NuxtLink>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <NuxtLink v-if="currentPage < totalPages" :to="{ query: buildQuery({ page: currentPage + 1 }) }">
          Next page
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
