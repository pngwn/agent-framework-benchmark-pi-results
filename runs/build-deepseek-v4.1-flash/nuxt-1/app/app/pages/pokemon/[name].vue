<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name || ''))

const selectedGame = computed(() => {
  const value = route.query.game
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
})

const { data } = await useFetch<any>(() => `/api/pokemon/${encodeURIComponent(name.value)}`, {
  query: computed(() => (selectedGame.value ? { game: selectedGame.value } : {})),
})

useHead({
  title: computed(() => (data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex')),
})

function changeGame(event: Event) {
  const game = (event.target as HTMLSelectElement).value
  router.push({ query: { ...route.query, game }, hash: route.hash })
}

const statMax = 255
</script>

<template>
  <NotFoundContent v-if="!data?.found" />
  <div v-else class="pokemon-page">
    <div class="hero">
      <img class="hero__artwork" :src="data.artwork" :alt="data.englishName" />
      <div class="hero__body">
        <p class="dex-number">{{ data.dexNumber }}</p>
        <h1>{{ data.englishName }}</h1>
        <p class="genus">{{ data.genus }}</p>
        <div class="type-row">
          <TypeBadge v-for="type in data.types" :key="type.name" :type="type" link />
        </div>
        <dl class="measurements">
          <div>
            <dt>Height</dt>
            <dd>{{ data.height }}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ data.weight }}</dd>
          </div>
        </dl>
        <p class="flavor-text">{{ data.flavor }}</p>
      </div>
    </div>

    <section class="panel" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="stat in data.stats" :key="stat.label">
            <th scope="row">{{ stat.label }}</th>
            <td class="stat-value">{{ stat.value }}</td>
            <td class="stat-bar-cell">
              <span class="stat-track">
                <span class="stat-fill" :style="{ width: `${Math.min(100, (stat.value / statMax) * 100)}%` }" />
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">Total</th>
            <td class="stat-value">{{ data.stats.reduce((sum: number, stat: any) => sum + stat.value, 0) }}</td>
            <td class="stat-bar-cell" />
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
      <ul class="evolution-list">
        <EvolutionNode :node="data.evolution" />
      </ul>
    </section>

    <section id="moves" class="panel moves-section" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div v-if="data.versions.length" class="game-picker">
        <label for="game-select">Game</label>
        <select id="game-select" :value="data.selectedGame" @change="changeGame">
          <option v-for="version in data.versions" :key="version.name" :value="version.name">{{ version.label }}</option>
        </select>
      </div>

      <div class="move-tables">
        <MoveTable v-for="method in data.moveMethods" :key="method.name" :method="method" />
      </div>
    </section>
  </div>
</template>
