<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const gameParam = computed(() => typeof route.query.game === 'string' ? route.query.game : '')

const { data } = await useFetch(() => `/api/pokemon/${route.params.name}`, {
  query: computed(() => ({ game: gameParam.value || undefined })),
})

const selectedGame = computed(() => {
  if (gameParam.value && data.value?.games?.some((game: any) => game.name === gameParam.value)) {
    return gameParam.value
  }
  return data.value?.selectedGame ?? ''
})

function onGameChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const query: Record<string, string> = {}
  for (const [key, entry] of Object.entries(route.query)) {
    if (typeof entry === 'string') query[key] = entry
  }
  if (value && value !== data.value?.latestGame) query.game = value
  else delete query.game

  router.push({ path: route.path, query, hash: route.hash || undefined })
}

function statWidth(value: number) {
  return `${Math.min(100, Math.max(0, (value / 180) * 100))}%`
}

useHead({
  title: computed(() => data.value?.notFound ? 'Not found – Pokédex' : `${data.value?.label ?? ''} – Pokédex`),
})
</script>

<template>
  <NotFoundContent v-if="data?.notFound" />
  <div v-else-if="data" class="pokemon-page">
    <article class="pokemon-summary">
      <div class="pokemon-summary__artwork">
        <img
          v-if="data.artwork"
          :src="data.artwork"
          :alt="data.label"
          width="288"
          height="288"
        >
      </div>
      <div class="pokemon-summary__info">
        <p class="pokemon-summary__dex">{{ data.dex }}</p>
        <h1 class="pokemon-summary__name">{{ data.label }}</h1>
        <p class="pokemon-summary__genus">{{ data.genus }}</p>

        <ul class="pokemon-summary__types">
          <li v-for="type in data.types" :key="type.name">
            <TypeBadge :name="type.label" :slug="type.name" link />
          </li>
        </ul>

        <dl class="measure-list">
          <div>
            <dt>Height</dt>
            <dd>{{ data.height.toFixed(1) }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ data.weight.toFixed(1) }} kg</dd>
          </div>
        </dl>

        <p class="pokemon-summary__flavor">{{ data.flavorText }}</p>
      </div>
    </article>

    <section class="content-section" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="stat in data.stats" :key="stat.label">
            <th scope="row">{{ stat.label }}</th>
            <td class="stats-table__value">{{ stat.value }}</td>
            <td class="stats-table__bar">
              <div class="stat-track">
                <div class="stat-fill" :style="{ width: statWidth(stat.value) }" />
              </div>
            </td>
          </tr>
          <tr class="stats-table__total">
            <th scope="row">Total</th>
            <td class="stats-table__value">{{ data.statsTotal }}</td>
            <td class="stats-table__bar">
              <div class="stat-track">
                <div class="stat-fill" :style="{ width: statWidth(data.statsTotal) }" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="content-section" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="plain-list">
        <li v-for="ability in data.abilities" :key="ability.name">
          <NuxtLink :to="`/abilities/${ability.name}`">{{ ability.label }}</NuxtLink>
          <template v-if="ability.hidden"> (hidden)</template>
        </li>
      </ul>
    </section>

    <section class="content-section" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <EvolutionList :nodes="[data.evolution]" />
    </section>

    <section id="moves" class="content-section" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>

      <div class="game-control">
        <label for="game-select">Game</label>
        <select id="game-select" :value="selectedGame" @change="onGameChange">
          <option v-for="game in data.games" :key="game.name" :value="game.name">
            {{ game.label }}
          </option>
        </select>
      </div>

      <MovesTable
        v-for="table in data.tables"
        :key="`${data.selectedGame}-${table.method}`"
        :table="table"
      />
    </section>
  </div>
</template>
