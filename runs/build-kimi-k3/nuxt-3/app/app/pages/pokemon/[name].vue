<script setup lang="ts">
import type { MoveRow } from '~/utils/poke'

const route = useRoute()
const router = useRouter()
const name = String(route.params.name).toLowerCase()

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const { data } = await useAsyncData(`pokemon-${name}`, async () => {
  const species = await fetchRecord('pokemon-species', name)
  if (!species) return null

  const defaultVariety =
    (species.varieties as { is_default: boolean; pokemon: NamedRef }[]).find((v) => v.is_default) ??
    species.varieties[0]
  const pokemon = await fetchApi(`/pokemon/${idFromUrl(defaultVariety.pokemon.url)}/`)

  const chainId = idFromUrl(species.evolution_chain.url)
  const [chain, versionGroupOrder, typeIndex] = await Promise.all([
    fetchApi(`/evolution-chain/${chainId}/`),
    getVersionGroupOrder(),
    getTypeIndex(),
  ])

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const seen = new Map<string, number>()
  for (const m of pokemon.moves as {
    version_group_details: { version_group: NamedRef }[]
  }[]) {
    for (const v of m.version_group_details) {
      const vgName = v.version_group.name
      const order = versionGroupOrder.get(vgName)
      if (order !== undefined && !seen.has(vgName)) seen.set(vgName, order)
    }
  }
  const games = [...seen.entries()]
    .map(([vgName, order]) => ({ name: vgName, order, label: humanize(vgName) }))
    .sort((a, b) => a.order - b.order)

  // Trimmed move learn data (kept small for the payload).
  const moves = (pokemon.moves as {
    move: NamedRef
    version_group_details: { version_group: NamedRef; move_learn_method: NamedRef; level_learned_at: number }[]
  }[]).map((m) => ({
    name: m.move.name,
    details: m.version_group_details.map((v) => ({
      game: v.version_group.name,
      method: v.move_learn_method.name,
      level: v.level_learned_at,
    })),
  }))

  const toTree = (node: any): { name: string; children: any[] } => ({
    name: node.species.name,
    children: (node.evolves_to as any[]).map(toTree),
  })

  const stats = (pokemon.stats as { base_stat: number; stat: NamedRef }[]).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }))

  const enName = englishName(species.names, species.name)
  const genus = (species.genera as { genus: string; language: { name: string } }[]).find(
    (g) => g.language.name === 'en',
  )?.genus

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? spriteUrl(pokemon.id)

  return {
    enName,
    dex: dexNumber(species.id),
    genus,
    flavor: latestEnglishFlavorText(species.flavor_text_entries),
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    types: (pokemon.types as { slot: number; type: NamedRef }[])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, en: typeIndex.enByName.get(t.type.name) ?? humanize(t.type.name) })),
    stats,
    statTotal: stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0),
    abilities: (pokemon.abilities as { is_hidden: boolean; slot: number; ability: NamedRef }[])
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    chain: toTree(chain.chain),
    games,
    moves,
    typeEn: Object.fromEntries(typeIndex.enByName),
  }
})

// The selected version group: from ?game= when valid, otherwise the latest one.
const gameParam = computed(() => (typeof route.query.game === 'string' ? route.query.game : ''))
const selectedGame = computed(() => {
  const games = data.value?.games ?? []
  if (games.some((g) => g.name === gameParam.value)) return gameParam.value
  return games.at(-1)?.name ?? ''
})

const FIXED_METHODS = ['level-up', 'machine', 'egg', 'tutor']

const { data: movesModel } = await useAsyncData(
  `pokemon-${name}-moves`,
  async () => {
    const d = data.value
    const game = selectedGame.value
    if (!d || !game) return { tables: [] }

    const byMethod = new Map<string, { name: string; level: number }[]>()
    for (const m of d.moves) {
      for (const det of m.details) {
        if (det.game !== game) continue
        let arr = byMethod.get(det.method)
        if (!arr) byMethod.set(det.method, (arr = []))
        if (!arr.some((e) => e.name === m.name && e.level === det.level)) {
          arr.push({ name: m.name, level: det.level })
        }
      }
    }

    const moveNames = [...new Set([...byMethod.values()].flat().map((e) => e.name))]
    const records = await mapLimit(moveNames, 16, (n) => fetchRecord('move', n))
    const recordByName = new Map(moveNames.map((n, i) => [n, records[i]]))

    const methods = [...byMethod.keys()]
    const ordered = [
      ...FIXED_METHODS.filter((f) => methods.includes(f)),
      ...methods.filter((m) => !FIXED_METHODS.includes(m)).sort((a, b) => humanize(a).localeCompare(humanize(b))),
    ]

    const tables = ordered.map((method) => {
      const hasLevel = method === 'level-up'
      const rows: MoveRow[] = byMethod.get(method)!.map((e) => {
        const rec = recordByName.get(e.name)
        const typeName: string = rec?.type?.name ?? ''
        return {
          level: e.level,
          name: e.name,
          nameEn: rec ? englishName(rec.names, e.name) : humanize(e.name),
          typeName,
          typeEn: typeName ? (d.typeEn[typeName] ?? humanize(typeName)) : '',
          category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : '—',
          power: rec?.power ?? null,
          accuracy: rec?.accuracy ?? null,
          pp: rec?.pp ?? null,
        }
      })
      rows.sort((a, b) =>
        hasLevel ? a.level - b.level || a.nameEn.localeCompare(b.nameEn) : a.nameEn.localeCompare(b.nameEn),
      )
      return { method, caption: humanize(method), hasLevel, rows }
    })
    return { tables }
  },
  { watch: [selectedGame] },
)

useHead({
  title: computed(() => (data.value ? `${data.value.enName} – Pokédex` : 'Not found – Pokédex')),
})

const event = useRequestEvent()
if (event && !data.value) event.node.res.statusCode = 404

function onGameChange(event2: Event) {
  const value = (event2.target as HTMLSelectElement).value
  const defaultGame = data.value?.games.at(-1)?.name
  router.push({
    query: value && value !== defaultGame ? { game: value } : {},
    hash: '#moves',
  })
}
</script>

<template>
  <NotFound v-if="!data" />
  <template v-else>
    <div class="panel pokemon-summary">
      <img class="artwork" :src="data.artwork" :alt="data.enName" width="288" height="288" />
      <div>
        <p class="dex">{{ data.dex }}</p>
        <h1>{{ data.enName }}</h1>
        <p class="genus">{{ data.genus }}</p>
        <p class="types">
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
        <dl class="facts">
          <div>
            <dt>Height</dt>
            <dd>{{ data.height }}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{{ data.weight }}</dd>
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
            <td class="stat-bar-cell">
              <div class="stat-bar" aria-hidden="true">
                <div class="stat-bar-fill" :style="{ width: `${Math.min(100, (s.value / 255) * 100)}%` }"></div>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row">Total</th>
            <td class="stat-value">{{ data.statTotal }}</td>
            <td class="stat-bar-cell">
              <div class="stat-bar" aria-hidden="true">
                <div
                  class="stat-bar-fill"
                  :style="{ width: `${Math.min(100, (data.statTotal / (255 * data.stats.length)) * 100)}%` }"
                ></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="link-list">
        <li v-for="a in data.abilities" :key="a.name">
          <NuxtLink :to="`/abilities/${a.name}`">{{ a.label }}</NuxtLink>
          <span v-if="a.hidden"> (hidden)</span>
        </li>
      </ul>
    </section>

    <section class="panel" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      <ul class="evolution-tree">
        <EvolutionNode :node="data.chain" />
      </ul>
    </section>

    <section id="moves" class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div v-if="data.games.length" class="field field-inline game-select">
        <label for="game">Game</label>
        <select id="game" name="game" @change="onGameChange">
          <option v-for="g in data.games" :key="g.name" :value="g.name" :selected="g.name === selectedGame">
            {{ g.label }}
          </option>
        </select>
      </div>
      <MovesTable
        v-for="t in movesModel?.tables ?? []"
        :key="t.method"
        :caption="t.caption"
        :rows="t.rows"
        :has-level="t.hasLevel"
      />
    </section>
  </template>
</template>
