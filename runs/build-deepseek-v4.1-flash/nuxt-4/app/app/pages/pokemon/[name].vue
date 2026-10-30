<script setup lang="ts">
definePageMeta({
  key: (route) => route.fullPath,
})

const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name))
const requestedGame = computed(() =>
  typeof route.query.game === 'string' ? route.query.game : '',
)

const { data } = await useAsyncData(`pokemon-${route.fullPath}`, async () => {
  const summary = await $fetch<any>(
    `/api/pokemon/${encodeURIComponent(name.value)}`,
  )
  if (!summary.found) return { found: false }

  const moves = await $fetch<any>(
    `/api/pokemon/${encodeURIComponent(name.value)}/moves`,
    {
      query: requestedGame.value ? { game: requestedGame.value } : {},
    },
  )
  return { found: true, summary, moves }
})

const summary = computed<any>(() =>
  data.value?.found ? data.value.summary : null,
)
const moves = computed<any>(() =>
  data.value?.found ? data.value.moves : null,
)

const heading = computed(() =>
  summary.value?.species.englishName ?? 'Not found',
)
useHead({
  title: computed(() => `${heading.value} – Pokédex`),
})

const gameValue = computed(() => moves.value?.game ?? '')

function changeGame(event: Event) {
  const game = (event.target as HTMLSelectElement).value
  router.push({
    path: route.path,
    query: { ...route.query, game },
    hash: route.hash || undefined,
  })
}

const statWidth = (value: number) =>
  `${Math.max(2, Math.min(100, (value / 255) * 100))}%`

onMounted(async () => {
  await nextTick()
  if (!route.hash) return
  try {
    document.querySelector(route.hash)?.scrollIntoView()
  } catch {
    // An invalid selector in the fragment should not break the page.
  }
})
</script>

<template>
  <div class="page pokemon-page">
    <NotFoundContent v-if="!summary" />

    <template v-else>
      <div class="pokemon-summary">
        <div class="artwork-wrap">
          <img
            v-if="summary.pokemon.artwork"
            class="artwork"
            :src="summary.pokemon.artwork"
            :alt="summary.species.englishName"
          >
        </div>

        <div class="summary-content">
          <h1>{{ summary.species.englishName }}</h1>
          <p class="dex-number">{{ dexNumber(summary.species.id) }}</p>
          <p class="genus">{{ summary.species.genus }}</p>

          <div class="summary-types">
            <TypeBadge
              v-for="type in summary.pokemon.types"
              :key="type.name"
              :name="type.name"
              :label="type.label"
              link
            />
          </div>

          <dl class="measurements">
            <div>
              <dt>Height</dt>
              <dd>{{ summary.pokemon.height }} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{{ summary.pokemon.weight }} kg</dd>
            </div>
          </dl>

          <p v-if="summary.species.flavorText" class="flavor-text">
            {{ summary.species.flavorText }}
          </p>
        </div>
      </div>

      <section class="surface" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            <tr v-for="stat in summary.pokemon.stats.rows" :key="stat.name">
              <th scope="row">{{ stat.label }}</th>
              <td class="stat-value">{{ stat.value }}</td>
              <td class="stat-bar-cell">
                <span class="stat-track">
                  <span
                    class="stat-bar"
                    :style="{ width: statWidth(stat.value) }"
                  />
                </span>
              </td>
            </tr>
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{{ summary.pokemon.stats.total }}</td>
              <td class="stat-bar-cell" />
            </tr>
          </tbody>
        </table>
      </section>

      <section class="surface" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          <li
            v-for="ability in summary.pokemon.abilities"
            :key="ability.name"
          >
            <NuxtLink :to="`/abilities/${ability.name}`">{{ ability.label }}</NuxtLink><span
              v-if="ability.hidden"
              class="muted"
            > (hidden)</span>
          </li>
        </ul>
      </section>

      <section class="surface" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ul v-if="summary.evolution" class="evolution-list">
          <EvolutionNode :node="summary.evolution" />
        </ul>
        <p v-else class="muted">—</p>
      </section>

      <section
        id="moves"
        class="surface moves-section"
        aria-labelledby="moves-heading"
      >
        <h2 id="moves-heading">Moves</h2>

        <div v-if="moves?.games?.length" class="game-picker">
          <label for="game-select">Game</label>
          <select id="game-select" :value="gameValue" @change="changeGame">
            <option
              v-for="game in moves.games"
              :key="game.name"
              :value="game.name"
            >{{ game.label }}</option>
          </select>
        </div>

        <div
          v-for="method in moves?.methods ?? []"
          :key="method.name"
          class="move-table-block"
        >
          <h3 class="method-heading">{{ method.label }}</h3>
          <MoveTable
            :title="method.label"
            :method="method.name"
            :rows="method.rows"
          />
        </div>
      </section>
    </template>
  </div>
</template>
