<script setup>
import { dexNumber, humanize } from '#shared/utils/format'

const route = useRoute()
const router = useRouter()

const { data, error } = await useFetch(() => `/api/pokemon/${route.params.name}`)

const notFound = computed(() => Boolean(error.value) || !data.value)
if (import.meta.server && error.value) setResponseStatus(404)

useHead({
  title: computed(() => (notFound.value ? 'Not found – Pokédex' : `${data.value.en} – Pokédex`)),
})

// Selected version group: from the URL query, defaulting to the latest one.
const game = computed(() => {
  const requested = typeof route.query.game === 'string' ? route.query.game : null
  if (requested && data.value?.games.some((g) => g.name === requested)) return requested
  return data.value?.defaultGame ?? null
})

function onGameChange(event) {
  router.push({ query: { ...route.query, game: event.target.value } })
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

const tables = computed(() => {
  const byMethod = data.value?.movesByGame?.[game.value] ?? {}
  const methods = Object.keys(byMethod).filter((m) => byMethod[m]?.length)
  methods.sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a)
    const ib = METHOD_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return humanize(a).localeCompare(humanize(b))
  })
  return methods.map((m) => ({
    name: m,
    label: humanize(m),
    rows: byMethod[m],
    showLevel: m === 'level-up',
  }))
})

const formatMeasure = (value, unit) => `${(value / 10).toFixed(1)} ${unit}`
const statBarWidth = (value, max) => `${Math.min(100, Math.round((value / max) * 100))}%`
</script>

<template>
  <NotFound v-if="notFound" />
  <div v-else>
    <div class="summary">
      <div class="artwork-card">
        <img v-if="data.artwork" :src="data.artwork" :alt="data.en" />
      </div>
      <div class="summary-info">
        <p class="dex-number">{{ dexNumber(data.id) }}</p>
        <h1 class="page-title">{{ data.en }}</h1>
        <p class="genus">{{ data.genus }}</p>
        <p class="type-links">
          <NuxtLink
            v-for="t in data.types"
            :key="t.name"
            :to="`/types/${t.name}`"
            class="type-badge"
            :class="`type-${t.name}`"
          >
            {{ t.en }}
          </NuxtLink>
        </p>
        <dl class="measurements">
          <div>
            <dt>Height</dt>
            <dd>{{ formatMeasure(data.height, 'm') }}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ formatMeasure(data.weight, 'kg') }}</dd>
          </div>
        </dl>
        <p class="flavor">{{ data.flavor }}</p>
      </div>
    </div>

    <PokeSection title="Base stats">
      <table class="stats-table">
        <tbody>
          <tr v-for="s in data.stats" :key="s.key">
            <th scope="row">{{ s.label }}</th>
            <td class="stat-value">{{ s.value }}</td>
            <td class="stat-bar">
              <div class="stat-track"><div class="stat-fill" :style="{ width: statBarWidth(s.value, 255) }" /></div>
            </td>
          </tr>
          <tr>
            <th scope="row">Total</th>
            <td class="stat-value">{{ data.total }}</td>
            <td class="stat-bar">
              <div class="stat-track"><div class="stat-fill" :style="{ width: statBarWidth(data.total, 6 * 255) }" /></div>
            </td>
          </tr>
        </tbody>
      </table>
    </PokeSection>

    <PokeSection title="Abilities">
      <ul class="bullet-list">
        <li v-for="a in data.abilities" :key="`${a.name}-${a.hidden}`">
          <NuxtLink :to="`/abilities/${a.name}`">{{ a.label }}</NuxtLink>
          <template v-if="a.hidden"> (hidden)</template>
        </li>
      </ul>
    </PokeSection>

    <PokeSection title="Evolution">
      <ul class="bullet-list">
        <EvolutionNode :node="data.evolution" />
      </ul>
    </PokeSection>

    <PokeSection id="moves" title="Moves">
      <div class="field game-field">
        <label for="game-select">Game</label>
        <select id="game-select" :value="game ?? ''" @change="onGameChange">
          <option v-for="g in data.games" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
      <MovesTable
        v-for="table in tables"
        :key="table.name"
        :label="table.label"
        :rows="table.rows"
        :show-level="table.showLevel"
      />
    </PokeSection>
  </div>
</template>
