<template>
  <NotFoundPage v-if="!data?.found" />
  <div v-else class="pokemon-page">
    <div class="pokemon-summary">
      <div class="pokemon-summary__artwork">
        <img
          v-if="data.artwork"
          :src="data.artwork"
          :alt="data.species.englishName"
          width="288"
          height="288"
        >
      </div>
      <div class="pokemon-summary__details">
        <h1>{{ data.species.englishName }}</h1>
        <p class="pokemon-summary__number">{{ data.dexNumber }}</p>
        <p class="pokemon-summary__genus">{{ data.genus }}</p>
        <p class="pokemon-summary__types">
          <NuxtLink
            v-for="type in data.types"
            :key="type.name"
            class="type-badge"
            :class="`type-${type.name}`"
            :to="`/types/${type.name}`"
          >{{ type.label }}</NuxtLink>
        </p>
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
        <p class="pokemon-summary__flavor">{{ data.flavor }}</p>
      </div>
    </div>

    <section class="page-section" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="stat in data.stats" :key="stat.label">
            <th scope="row">{{ stat.label }}</th>
            <td class="stats-table__value">{{ stat.value }}</td>
            <td class="stats-table__bar-cell">
              <span class="stats-table__track">
                <span class="stats-table__bar" :style="{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }" />
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">Total</th>
            <td class="stats-table__value">{{ data.total }}</td>
            <td class="stats-table__bar-cell">
              <span class="stats-table__track">
                <span class="stats-table__bar" :style="{ width: `${Math.min(100, (data.total / 255) * 100)}%` }" />
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="page-section" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="plain-list">
        <li v-for="ability in data.abilities" :key="ability.name">
          <NuxtLink :to="`/abilities/${ability.name}`">{{ ability.label }}</NuxtLink>
          <template v-if="ability.hidden"> (hidden)</template>
        </li>
      </ul>
    </section>

    <section class="page-section" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <EvolutionTree :node="data.evolution" />
    </section>

    <section id="moves" class="page-section" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <MoveTables
        :key="data.moves.selectedGame?.name || 'none'"
        :tables="data.moves.tables"
        :games="data.moves.games"
        :selected-game="data.moves.selectedGame"
        @select-game="selectGame"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name || ''))
const game = computed(() => typeof route.query.game === 'string' ? route.query.game : undefined)

const { data } = await useFetch(() => `/api/app/pokemon/${encodeURIComponent(name.value)}`, {
  query: { game },
  watch: [game],
})

useHead({
  title: computed(() => data.value?.found ? `${data.value.species.englishName} – Pokédex` : 'Not found – Pokédex'),
})

function selectGame(value: string) {
  router.push({ path: route.path, query: { ...route.query, game: value }, hash: route.hash })
}

function scrollToHash() {
  if (!route.hash) return
  const target = document.getElementById(route.hash.slice(1))
  if (target) target.scrollIntoView({ block: 'start' })
}

onMounted(() => {
  nextTick(scrollToHash)
})

watch(() => data.value, () => {
  nextTick(scrollToHash)
})
</script>
