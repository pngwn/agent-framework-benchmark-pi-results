<script setup>
const route = useRoute()
const router = useRouter()

useHead({ title: 'Pokédex' })

const PAGE_SIZE = 48

const { data } = await useAsyncData('home-data', async () => {
  const [species, typeIndex, generations] = await Promise.all([getSpeciesList(), getTypeIndex(), getGenerations()])

  // Types per species (in slot order), from the type records.
  const speciesIds = new Set(species.map((s) => s.id))
  const typesBySpecies = new Map()
  for (const t of typeIndex.list) {
    const en = enName(t)
    for (const p of t.pokemon) {
      const pid = idFromUrl(p.pokemon.url)
      if (!speciesIds.has(pid)) continue
      let arr = typesBySpecies.get(pid)
      if (!arr) typesBySpecies.set(pid, (arr = []))
      arr.push({ name: t.name, en, slot: p.slot })
    }
  }
  for (const arr of typesBySpecies.values()) arr.sort((a, b) => a.slot - b.slot)

  // Generation per species.
  const genBySpecies = {}
  for (const g of generations) {
    for (const name of g.species) genBySpecies[name] = g.name
  }

  return {
    species,
    types: typeIndex.list.map((t) => ({ name: t.name, en: enName(t) })),
    generations: generations.map((g) => ({ name: g.name, en: g.enName })),
    typesBySpecies: Object.fromEntries(typesBySpecies),
    genBySpecies,
  }
})

const q = computed(() => String(route.query.q ?? ''))
const type = computed(() => String(route.query.type ?? ''))
const generation = computed(() => String(route.query.generation ?? ''))
const requestedPage = computed(() => Math.max(1, parseInt(String(route.query.page ?? '1'), 10) || 1))

const filtered = computed(() => {
  const d = data.value
  if (!d) return []
  const needle = q.value.trim().toLowerCase()
  return d.species.filter((s) => {
    if (needle && !humanize(s.name).toLowerCase().includes(needle)) return false
    if (type.value && !(d.typesBySpecies[s.id] ?? []).some((t) => t.name === type.value)) return false
    if (generation.value && d.genBySpecies[s.name] !== generation.value) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const page = computed(() => Math.min(requestedPage.value, totalPages.value))
const pageItems = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

// --- Filter controls -------------------------------------------------------

const searchText = ref(q.value)
watch(q, (v) => {
  searchText.value = v
})

let searchTimer
onBeforeUnmount(() => clearTimeout(searchTimer))

function pushQuery(patch, { resetPage = true } = {}) {
  const query = { ...route.query, ...patch }
  for (const key of Object.keys(query)) {
    if (query[key] == null || query[key] === '') delete query[key]
  }
  if (resetPage) delete query.page
  router.push({ query })
}

function onSearchInput(event) {
  searchText.value = event.target.value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pushQuery({ q: searchText.value })
  }, 200)
}

function onTypeChange(event) {
  pushQuery({ type: event.target.value })
}

function onGenerationChange(event) {
  pushQuery({ generation: event.target.value })
}

function pageQuery(n) {
  const query = { ...route.query }
  if (n <= 1) delete query.page
  else query.page = String(n)
  return query
}
</script>

<template>
  <div>
    <h1>Pokémon</h1>

    <form class="controls" @submit.prevent>
      <div class="field field-search">
        <label for="search">Search</label>
        <input
          id="search"
          type="search"
          name="q"
          autocomplete="off"
          :value="searchText"
          @input="onSearchInput"
        >
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" name="type" :value="type" @change="onTypeChange">
          <option value="">All types</option>
          <option v-for="t in data?.types ?? []" :key="t.name" :value="t.name" :selected="t.name === type">
            {{ t.en }}
          </option>
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" name="generation" :value="generation" @change="onGenerationChange">
          <option value="">All generations</option>
          <option
            v-for="g in data?.generations ?? []"
            :key="g.name"
            :value="g.name"
            :selected="g.name === generation"
          >
            {{ g.en }}
          </option>
        </select>
      </div>
    </form>

    <p class="result-count">{{ filtered.length }} Pokémon</p>

    <p v-if="!filtered.length" class="empty">No Pokémon found</p>
    <template v-else>
      <ul class="card-grid">
        <PokemonCard
          v-for="s in pageItems"
          :key="s.id"
          :id="s.id"
          :name="s.name"
          :types="data.typesBySpecies[s.id]"
        />
      </ul>
      <div class="pagination">
        <span class="pagination-status">Page {{ page }} of {{ totalPages }}</span>
        <NuxtLink v-if="page > 1" :to="{ query: pageQuery(page - 1) }">Previous page</NuxtLink>
        <NuxtLink v-if="page < totalPages" :to="{ query: pageQuery(page + 1) }">Next page</NuxtLink>
      </div>
    </template>
  </div>
</template>
