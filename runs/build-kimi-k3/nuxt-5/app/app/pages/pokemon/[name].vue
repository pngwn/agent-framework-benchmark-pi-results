<script setup>
const route = useRoute()
const router = useRouter()
const name = String(route.params.name)

const { data } = await useAsyncData(`pokemon:${name}`, async () => {
  let species
  try {
    species = await fetchApi(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`)
  } catch {
    return null
  }
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0]
  const [pokemon, chain, typeIndex] = await Promise.all([
    fetchApi(`/api/v2/pokemon/${encodeURIComponent(variety.pokemon.name)}/`),
    fetchApi(`/api/v2/evolution-chain/${idFromUrl(species.evolution_chain.url)}/`),
    getTypeIndex(),
  ])

  const vgNames = [...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))]
  const vgs = (await Promise.all(vgNames.map((n) => getVersionGroup(n)))).sort((a, b) => a.order - b.order)

  const simplifyChain = (node) => ({
    name: node.species.name,
    children: (node.evolves_to ?? []).map(simplifyChain),
  })

  return {
    id: species.id,
    name: species.name,
    enName: enName(species),
    genus: enGenus(species),
    flavorText: latestEnFlavorText(species.flavor_text_entries),
    height: pokemon.height,
    weight: pokemon.weight,
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.other?.home?.front_default ??
      pokemon.sprites?.front_default ??
      spriteUrl(pokemon.id),
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, en: typeEnName(typeIndex, t.type.name) })),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    stats: pokemon.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    moves: pokemon.moves.map((m) => ({
      name: m.move.name,
      details: m.version_group_details.map((d) => ({
        vg: d.version_group.name,
        method: d.move_learn_method.name,
        level: d.level_learned_at,
      })),
    })),
    chain: simplifyChain(chain.chain),
    games: vgs.map((v) => ({ name: v.name, label: humanize(v.name) })),
  }
})

if (!data.value) setResponseStatus(404)

useHead({
  title: computed(() => (data.value ? `${data.value.enName} – Pokédex` : 'Not found – Pokédex')),
})

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const totalStats = computed(() => (data.value?.stats ?? []).reduce((sum, s) => sum + s.value, 0))

const defaultGame = computed(() => data.value?.games.at(-1)?.name ?? '')
const game = computed(() => {
  const g = String(route.query.game ?? '')
  return data.value?.games.some((x) => x.name === g) ? g : defaultGame.value
})

const { data: tables } = await useAsyncData(
  `pokemon-moves:${name}`,
  () => (data.value ? loadMoveTables(data.value.moves, game.value) : []),
  { watch: [game], default: () => [] },
)

function onGameChange(event) {
  router.push({ query: { ...route.query, game: event.target.value } })
}
</script>

<template>
  <NotFound v-if="!data" />
  <div v-else>
    <div class="surface summary">
      <img class="summary-artwork" :src="data.artwork" :alt="data.enName" width="288" height="288">
      <div class="summary-info">
        <p class="summary-dex">{{ dexNumber(data.id) }}</p>
        <h1>{{ data.enName }}</h1>
        <p class="summary-genus">{{ data.genus }}</p>
        <p class="summary-types">
          <TypeBadge v-for="t in data.types" :key="t.name" :name="t.name" :label="t.en" />
        </p>
        <dl class="facts">
          <div class="fact">
            <dt>Height</dt>
            <dd>{{ (data.height / 10).toFixed(1) }} m</dd>
          </div>
          <div class="fact">
            <dt>Weight</dt>
            <dd>{{ (data.weight / 10).toFixed(1) }} kg</dd>
          </div>
        </dl>
      </div>
    </div>

    <p class="flavor-text">{{ data.flavorText }}</p>

    <section class="surface" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="s in data.stats" :key="s.name">
            <th scope="row">{{ STAT_LABELS[s.name] ?? humanize(s.name) }}</th>
            <td class="stat-value">{{ s.value }}</td>
            <td class="stat-bar">
              <span class="stat-track">
                <span class="stat-fill" :style="{ width: `${Math.min(100, (s.value / 255) * 100)}%` }" />
              </span>
            </td>
          </tr>
          <tr class="stat-total">
            <th scope="row">Total</th>
            <td class="stat-value">{{ totalStats }}</td>
            <td class="stat-bar">
              <span class="stat-track">
                <span class="stat-fill" :style="{ width: `${Math.min(100, (totalStats / (255 * 6)) * 100)}%` }" />
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="surface" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="link-list">
        <li v-for="a in data.abilities" :key="a.name">
          <NuxtLink :to="`/abilities/${a.name}`">{{ humanize(a.name) }}</NuxtLink><span v-if="a.hidden" class="muted"> (hidden)</span>
        </li>
      </ul>
    </section>

    <section class="surface" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <ul class="evo-tree">
        <EvolutionNode :node="data.chain" />
      </ul>
    </section>

    <section id="moves" class="surface" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div class="field game-field">
        <label for="game">Game</label>
        <select id="game" name="game" :value="game" @change="onGameChange">
          <option v-for="g in data.games" :key="g.name" :value="g.name" :selected="g.name === game">
            {{ g.label }}
          </option>
        </select>
      </div>
      <MovesTable v-for="t in tables" :key="t.method" :table="t" />
    </section>
  </div>
</template>
