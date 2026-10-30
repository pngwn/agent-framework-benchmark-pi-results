<template>
  <NotFoundContent v-if="data?.notFound || !data" />
  <div v-else class="pokemon-page">
    <div class="pokemon-summary">
      <div class="artwork-wrap">
        <img v-if="data.artwork" :src="data.artwork" :alt="data.name" class="artwork" />
        <img v-else :src="data.sprite" :alt="data.name" class="artwork" />
      </div>
      <div class="summary-body">
        <span class="dex-number summary-dex">#{{ String(data.id).padStart(4, '0') }}</span>
        <h1>{{ data.name }}</h1>
        <p class="genus">{{ data.genus }}</p>
        <div class="type-list summary-types">
          <NuxtLink
            v-for="type in data.types"
            :key="type.name"
            :to="`/types/${type.name}`"
            class="type-link"
          >
            <TypeBadge :type="{ name: type.name, label: type.english }" />
          </NuxtLink>
        </div>

        <dl class="measurements">
          <div>
            <dt>Height</dt>
            <dd>{{ data.height.toFixed(1) }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ data.weight.toFixed(1) }} kg</dd>
          </div>
        </dl>

        <p class="flavor-text">{{ data.flavor }}</p>
      </div>
    </div>

    <section class="panel" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="stat in data.stats" :key="stat.name">
            <th scope="row">{{ stat.label }}</th>
            <td class="stat-value">{{ stat.value }}</td>
            <td class="stat-bar-cell">
              <span class="stat-track">
                <span
                  class="stat-bar"
                  :style="{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }"
                ></span>
              </span>
            </td>
          </tr>
          <tr class="total-row">
            <th scope="row">Total</th>
            <td class="stat-value">{{ data.statTotal }}</td>
            <td class="stat-bar-cell">
              <span class="stat-track">
                <span
                  class="stat-bar"
                  :style="{ width: `${Math.min(100, (data.statTotal / 720) * 100)}%` }"
                ></span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="plain-list">
        <li v-for="ability in data.abilities" :key="ability.name">
          <NuxtLink :to="`/abilities/${ability.name}`">{{ ability.label }}</NuxtLink>
          <span v-if="ability.hidden"> (hidden)</span>
        </li>
      </ul>
    </section>

    <section class="panel" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <ul v-if="data.evolution" class="evolution-list">
        <EvolutionNode :node="data.evolution" />
      </ul>
    </section>

    <section id="moves" class="panel moves-section" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div class="game-picker">
        <label for="game">Game</label>
        <select id="game" :value="selectedGame" @change="onGameChange">
          <option v-for="game in data.games" :key="game.name" :value="game.name">{{ game.label }}</option>
        </select>
      </div>

      <div class="tables-scroll">
        <MoveMethodTable
          v-for="method in methods"
          :key="method.method"
          :method="method.method"
          :method-label="method.label"
          :rows="method.rows"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/pokemon/${encodeURIComponent(name.value)}`, {
  watch: [name],
})

useHead(() => ({
  title: data.value?.notFound
    ? 'Not found – Pokédex'
    : data.value?.name
      ? `${data.value.name} – Pokédex`
      : 'Pokédex',
}))

const games = computed<any[]>(() => data.value?.games || [])
const latestGame = computed(() => games.value[games.value.length - 1]?.name || '')
const selectedGame = computed(() => {
  const requested = String(route.query.game || '')
  return games.value.some((game) => game.name === requested) ? requested : latestGame.value
})

const selectedGroup = computed<any>(() => data.value?.moveGroups?.[selectedGame.value] || null)

const preferredMethods = ['level-up', 'machine', 'egg', 'tutor']
const methods = computed(() => {
  const rows = selectedGroup.value?.rows || []
  const grouped = new Map<string, { label: string; rows: any[] }>()
  for (const row of rows) {
    if (!grouped.has(row.method)) grouped.set(row.method, { label: row.methodLabel, rows: [] })
    grouped.get(row.method)!.rows.push(row)
  }
  return [...grouped.entries()]
    .sort(([methodA, infoA], [methodB, infoB]) => {
      const a = preferredMethods.indexOf(methodA)
      const b = preferredMethods.indexOf(methodB)
      if (a !== -1 && b !== -1) return a - b
      if (a !== -1) return -1
      if (b !== -1) return 1
      return infoA.label.localeCompare(infoB.label)
    })
    .map(([method, info]) => ({ method, label: info.label, rows: info.rows }))
})

function onGameChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const query: Record<string, string> = {}
  for (const [key, entry] of Object.entries(route.query)) {
    if (typeof entry === 'string' && key !== 'game') query[key] = entry
  }
  if (value && value !== latestGame.value) query.game = value
  router.replace({ path: route.path, query, hash: route.hash })
}
</script>
