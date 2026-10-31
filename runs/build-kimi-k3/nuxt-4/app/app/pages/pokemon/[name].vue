<script setup lang="ts">
import { setResponseStatus } from 'h3'
import { api, englishName, humanize, idFromUrl, latestEnFlavor } from '~/lib/pokeapi'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

const route = useRoute()
const router = useRouter()
const base = useApiBase()

async function load(name: string, gameQuery: unknown) {
  const species = await api(base, `/pokemon-species/${encodeURIComponent(name)}/`)
  if (!species) return null
  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0]
  const pokemon = variety ? await api(base, `/pokemon/${idFromUrl(variety.pokemon.url)}/`) : null
  if (!pokemon) return null

  const chainUrl = species.evolution_chain?.url
  const chainRecord = chainUrl ? await api(base, `/evolution-chain/${idFromUrl(chainUrl)}/`) : null

  // Version groups in which this Pokémon learns moves, ordered by their `order`.
  const vgNames = new Set<string>()
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) vgNames.add(d.version_group.name)
  }
  const vgRecords = (await Promise.all([...vgNames].map((n) => api(base, `/version-group/${n}/`))))
    .filter(Boolean)
    .sort((a: any, b: any) => a.order - b.order)
  const games = vgRecords.map((g: any) => ({ name: g.name, label: humanize(g.name) }))
  let selectedGame = games.length ? games[games.length - 1].name : null
  if (typeof gameQuery === 'string' && games.some((g) => g.name === gameQuery)) selectedGame = gameQuery

  // Moves for the selected version group, grouped by learn method.
  const rawRows: { ref: any; level: number; method: string }[] = []
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== selectedGame) continue
      rawRows.push({ ref: m.move, level: d.level_learned_at, method: d.move_learn_method.name })
    }
  }
  const uniqueRefs = [...new Map(rawRows.map((r) => [r.ref.name, r.ref])).values()]
  const moveRecords = await Promise.all(uniqueRefs.map((r: any) => api(base, `/move/${idFromUrl(r.url)}/`)))
  const moveByName = new Map(uniqueRefs.map((r: any, i: number) => [r.name, moveRecords[i]]))

  const byMethod = new Map<string, any[]>()
  rawRows.forEach((r, i) => {
    const rec: any = moveByName.get(r.ref.name)
    const row = {
      key: `${r.ref.name}-${r.method}-${i}`,
      level: r.level,
      move: { name: r.ref.name, english: englishName(rec?.names) ?? humanize(r.ref.name) },
      type: rec?.type
        ? { name: rec.type.name, english: humanize(rec.type.name) }
        : { name: '', english: '—' },
      category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : '—',
      power: rec?.power ?? null,
      accuracy: rec?.accuracy ?? null,
      pp: rec?.pp ?? null,
    }
    const arr = byMethod.get(r.method) ?? []
    arr.push(row)
    byMethod.set(r.method, arr)
  })
  const methods = [...byMethod.entries()].map(([mName, rows]) => {
    const sorted =
      mName === 'level-up'
        ? rows.sort((a, b) => a.level - b.level || a.move.english.localeCompare(b.move.english))
        : rows.sort((a, b) => a.move.english.localeCompare(b.move.english))
    return { name: mName, label: humanize(mName), rows: sorted }
  })
  methods.sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a.name)
    const ib = METHOD_ORDER.indexOf(b.name)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.label.localeCompare(b.label)
  })

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }))

  return {
    title: englishName(species.names) ?? humanize(species.name),
    dex: species.id,
    genus: species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null,
    flavor: latestEnFlavor(species.flavor_text_entries),
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, english: humanize(t.type.name) })),
    stats,
    total: stats.reduce((sum: number, s: any) => sum + s.value, 0),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, human: humanize(a.ability.name), hidden: !!a.is_hidden })),
    chain: chainRecord?.chain ?? null,
    games,
    selectedGame,
    methods,
  }
}

const { data } = await useAsyncData(`pokemon-${route.params.name}`, () => load(String(route.params.name), route.query.game), {
  watch: [() => route.params.name, () => route.query.game],
})

if (!data.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

useHead({
  title: computed(() => (data.value ? `${data.value.title} – Pokédex` : 'Not found – Pokédex')),
})

const dexNumber = computed(() => `#${String(data.value?.dex ?? 0).padStart(4, '0')}`)

function onGameChange(event: Event) {
  router.push({ query: { ...route.query, game: (event.target as HTMLSelectElement).value } })
}
</script>

<template>
  <NotFound v-if="!data" />
  <div v-else>
    <div class="panel hero">
      <img v-if="data.artwork" class="artwork" :src="data.artwork" :alt="data.title" width="288" height="288" />
      <div class="hero-info">
        <p class="dex-number">{{ dexNumber }}</p>
        <h1>{{ data.title }}</h1>
        <p class="genus">{{ data.genus }}</p>
        <p class="badges hero-badges">
          <NuxtLink
            v-for="t in data.types"
            :key="t.name"
            class="badge"
            :style="{ backgroundColor: `var(--type-${t.name})` }"
            :to="`/types/${t.name}`"
          >
            {{ t.english }}
          </NuxtLink>
        </p>
        <dl class="detail-list">
          <div>
            <dt>Height</dt>
            <dd>{{ data.height }} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ data.weight }} kg</dd>
          </div>
        </dl>
      </div>
      <p v-if="data.flavor" class="flavor">{{ data.flavor }}</p>
    </div>

    <section class="panel" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          <tr v-for="s in data.stats" :key="s.label">
            <th scope="row">{{ s.label }}</th>
            <td class="stat-value">{{ s.value }}</td>
            <td class="stat-bar">
              <span class="track"><span class="fill" :style="{ width: `${Math.min(100, (s.value / 255) * 100)}%` }" /></span>
            </td>
          </tr>
          <tr>
            <th scope="row">Total</th>
            <td class="stat-value">{{ data.total }}</td>
            <td class="stat-bar">
              <span class="track"><span class="fill" :style="{ width: `${Math.min(100, (data.total / 720) * 100)}%` }" /></span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="plain-list">
        <li v-for="a in data.abilities" :key="a.name">
          <NuxtLink :to="`/abilities/${a.name}`">{{ a.human }}</NuxtLink><span v-if="a.hidden" class="muted"> (hidden)</span>
        </li>
      </ul>
    </section>

    <section v-if="data.chain" class="panel" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <ul class="plain-list evo-tree">
        <EvoNode :node="data.chain" />
      </ul>
    </section>

    <section id="moves" class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div v-if="data.games.length" class="game-field">
        <label for="game-select">Game</label>
        <select id="game-select" :value="data.selectedGame" @change="onGameChange">
          <option v-for="g in data.games" :key="g.name" :value="g.name">{{ g.label }}</option>
        </select>
      </div>
      <MoveTable
        v-for="m in data.methods"
        :key="m.name"
        :label="m.label"
        :show-level="m.name === 'level-up'"
        :rows="m.rows"
      />
    </section>
  </div>
</template>
