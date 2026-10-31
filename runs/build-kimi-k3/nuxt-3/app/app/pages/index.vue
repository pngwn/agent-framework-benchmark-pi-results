<script setup lang="ts">
useHead({ title: 'Pokédex' })

const PAGE_SIZE = 48

const route = useRoute()
const router = useRouter()

interface HomeSpecies {
  id: number
  name: string
  humanized: string
  generation: string
  types: { name: string; en: string }[]
}

const { data: model } = await useAsyncData('home', async () => {
  const [speciesIndex, typeIndex, generationIndex] = await Promise.all([
    getSpeciesIndex(),
    getTypeIndex(),
    getGenerationIndex(),
  ])
  const species: HomeSpecies[] = speciesIndex.list.map((s) => ({
    id: s.id,
    name: s.name,
    humanized: humanize(s.name),
    generation: generationIndex.speciesGeneration.get(s.name) ?? '',
    types: (typeIndex.typesByPokemonId.get(s.id) ?? []).map((t) => ({
      name: t,
      en: typeIndex.enByName.get(t) ?? humanize(t),
    })),
  }))
  return {
    species,
    types: typeIndex.types,
    generations: generationIndex.generations,
  }
})

// Filter state lives in the URL query.
const qParam = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const typeParam = computed(() => (typeof route.query.type === 'string' ? route.query.type : ''))
const generationParam = computed(() => (typeof route.query.generation === 'string' ? route.query.generation : ''))
const pageParam = computed(() => {
  const n = Number.parseInt(typeof route.query.page === 'string' ? route.query.page : '', 10)
  return Number.isFinite(n) && n > 0 ? n : 1
})

function buildQuery(overrides: Record<string, string | undefined> = {}) {
  return {
    q: qParam.value || undefined,
    type: typeParam.value || undefined,
    generation: generationParam.value || undefined,
    page: pageParam.value > 1 ? String(pageParam.value) : undefined,
    ...overrides,
  }
}

const pageQuery = (n: number) => buildQuery({ page: n > 1 ? String(n) : undefined })

// Search box: local state synced to the URL (debounced) as the user types.
const searchInput = ref(qParam.value)
watch(qParam, (v) => {
  if (v !== searchInput.value) searchInput.value = v
})
let debounce: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (v) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    if (v !== qParam.value) {
      router.replace({ query: buildQuery({ q: v || undefined, page: undefined }) })
    }
  }, 250)
})

function onTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.push({ query: buildQuery({ type: value || undefined, page: undefined }) })
}

function onGenerationChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.push({ query: buildQuery({ generation: value || undefined, page: undefined }) })
}

const filtered = computed(() => {
  const all = model.value?.species ?? []
  const q = qParam.value.trim().toLowerCase()
  return all.filter(
    (s) =>
      (!q || s.humanized.toLowerCase().includes(q)) &&
      (!typeParam.value || s.types.some((t) => t.name === typeParam.value)) &&
      (!generationParam.value || s.generation === generationParam.value),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const currentPage = computed(() => Math.min(pageParam.value, totalPages.value))
const pageItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const cardOf = (s: HomeSpecies) => ({
  id: s.id,
  name: s.humanized,
  speciesName: s.name,
  sprite: spriteUrl(s.id),
  hidden: false,
})
</script>

<template>
  <h1>Pokémon</h1>

  <form class="filters" @submit.prevent>
    <div class="field field-search">
      <label for="search">Search</label>
      <input id="search" v-model="searchInput" type="search" name="q" autocomplete="off" />
    </div>
    <div class="field">
      <label for="type-filter">Type</label>
      <select id="type-filter" name="type" @change="onTypeChange">
        <option value="" :selected="typeParam === ''">All types</option>
        <option v-for="t in model?.types ?? []" :key="t.name" :value="t.name" :selected="typeParam === t.name">
          {{ t.en }}
        </option>
      </select>
    </div>
    <div class="field">
      <label for="generation-filter">Generation</label>
      <select id="generation-filter" name="generation" @change="onGenerationChange">
        <option value="" :selected="generationParam === ''">All generations</option>
        <option v-for="g in model?.generations ?? []" :key="g.name" :value="g.name" :selected="generationParam === g.name">
          {{ g.en }}
        </option>
      </select>
    </div>
  </form>

  <p class="count">{{ filtered.length }} Pokémon</p>

  <ul v-if="pageItems.length" class="card-grid">
    <PokemonCard v-for="s in pageItems" :key="s.id" :card="cardOf(s)" :types="s.types" />
  </ul>
  <p v-else>No Pokémon found</p>

  <div class="pagination">
    <span>Page {{ currentPage }} of {{ totalPages }}</span>
    <NuxtLink v-if="currentPage > 1" :to="{ query: pageQuery(currentPage - 1) }">Previous page</NuxtLink>
    <NuxtLink v-if="currentPage < totalPages" :to="{ query: pageQuery(currentPage + 1) }">Next page</NuxtLink>
  </div>
</template>
