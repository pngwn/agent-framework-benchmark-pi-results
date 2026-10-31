<script setup lang="ts">
import { setResponseStatus } from 'h3'

const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name).toLowerCase())

const { data: p, error } = await useFetch(() => `/api/pokemon/${name.value}`, { watch: [name] })

const requestEvent = useRequestEvent()
if (error.value && requestEvent) setResponseStatus(requestEvent, 404)

useHead({
  title: computed(() => (p.value ? `${p.value.enName} – Pokédex` : 'Not found – Pokédex')),
})

const versionGroups = computed(() => p.value?.versionGroups ?? [])
const defaultGame = computed(() =>
  versionGroups.value.length ? versionGroups.value[versionGroups.value.length - 1].name : '',
)
const game = computed(() => {
  const q = route.query.game
  if (typeof q === 'string' && versionGroups.value.some((g: any) => g.name === q)) return q
  return defaultGame.value
})

const { data: moves } = p.value
  ? await useFetch(() => `/api/pokemon/${name.value}/moves`, {
      query: { game },
      watch: [game, name],
    })
  : { data: ref(null) }

function onGameChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  router.push({ query: value === defaultGame.value ? {} : { game: value } })
}

const totalBase = computed(() =>
  (p.value?.stats ?? []).reduce((sum: number, s: any) => sum + s.base, 0),
)
const statCount = computed(() => Math.max(1, (p.value?.stats ?? []).length))
</script>

<template>
  <NotFound v-if="error" />
  <div v-else-if="p">
    <div class="poke-summary">
      <div class="artwork-card">
        <img v-if="p.artwork" :src="p.artwork" :alt="p.enName" width="288" height="288">
      </div>
      <div class="poke-info">
        <p class="dex-number">{{ dexNumber(p.id) }}</p>
        <h1>{{ p.enName }}</h1>
        <p v-if="p.genus" class="genus">{{ p.genus }}</p>
        <p class="type-links">
          <NuxtLink
            v-for="t in p.types"
            :key="t.name"
            :to="`/types/${t.name}`"
            class="type-badge"
            :class="`type-${t.name}`"
          >{{ t.label }}</NuxtLink>
        </p>
        <dl class="facts">
          <div>
            <dt>Height</dt>
            <dd>{{ (p.height / 10).toFixed(1) }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ (p.weight / 10).toFixed(1) }} kg</dd>
          </div>
        </dl>
      </div>
    </div>

    <p v-if="p.flavor" class="flavor card-block">{{ p.flavor }}</p>

    <section class="card-block" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="s in p.stats" :key="s.name">
            <th scope="row">{{ statLabel(s.name) }}</th>
            <td class="stat-num">{{ s.base }}</td>
            <td class="stat-bar-cell">
              <div class="stat-track">
                <div class="stat-fill" :style="{ width: `${Math.min(100, (s.base / 255) * 100)}%` }" />
              </div>
            </td>
          </tr>
          <tr class="total-row">
            <th scope="row">Total</th>
            <td class="stat-num">{{ totalBase }}</td>
            <td class="stat-bar-cell">
              <div class="stat-track">
                <div
                  class="stat-fill"
                  :style="{ width: `${Math.min(100, (totalBase / (255 * statCount)) * 100)}%` }"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card-block" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="plain-list">
        <li v-for="a in p.abilities" :key="a.name">
          <NuxtLink :to="`/abilities/${a.name}`">{{ a.label }}</NuxtLink><span v-if="a.hidden"> (hidden)</span>
        </li>
      </ul>
    </section>

    <section class="card-block" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <ul class="plain-list evo-tree">
        <EvolutionNode v-for="node in p.evolution" :key="node.name" :node="node" />
      </ul>
    </section>

    <section v-if="versionGroups.length" id="moves" class="card-block" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div class="game-field">
        <label for="game">Game</label>
        <select id="game" :value="game" @change="onGameChange">
          <option v-for="g in versionGroups" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
      <div :key="game">
        <MovesTable v-for="m in moves?.methods ?? []" :key="m.name" :method="m" />
      </div>
    </section>
  </div>
</template>
