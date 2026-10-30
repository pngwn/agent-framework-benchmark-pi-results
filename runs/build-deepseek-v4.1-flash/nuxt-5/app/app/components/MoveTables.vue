<template>
  <div class="move-tables">
    <div class="game-picker">
      <label for="moves-game">Game</label>
      <select
        id="moves-game"
        :value="selectedGame?.name || ''"
        @change="emit('select-game', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="game in games" :key="game.name" :value="game.name">{{ game.label }}</option>
      </select>
    </div>

    <div v-for="table in tables" :key="table.method" class="moves-table-wrap">
      <div class="table-scroll">
        <table class="moves-table">
          <caption>{{ table.label }}</caption>
          <thead>
            <tr>
              <th
                v-for="column in columnsFor(table)"
                :key="column.key"
                scope="col"
                :aria-sort="sortFor(table).key === column.key ? sortFor(table).dir : undefined"
              >
                <button type="button" @click="sortBy(table, column.key)">{{ column.label }}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedRows(table)" :key="`${row.move.name}-${row.level}`">
              <td v-if="table.showLevel" class="moves-table__level">{{ row.level }}</td>
              <td><NuxtLink :to="`/moves/${row.move.name}`">{{ row.move.label }}</NuxtLink></td>
              <td>
                <NuxtLink
                  class="type-badge"
                  :class="`type-${row.type.name}`"
                  :to="`/types/${row.type.name}`"
                >{{ row.type.label }}</NuxtLink>
              </td>
              <td>{{ row.category }}</td>
              <td class="moves-table__number">{{ displayNumber(row.power) }}</td>
              <td class="moves-table__number">{{ displayNumber(row.accuracy) }}</td>
              <td class="moves-table__number">{{ displayNumber(row.pp) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Sort = { key: string; dir: 'ascending' | 'descending' }

const props = defineProps<{
  tables: Array<{
    method: string
    label: string
    showLevel: boolean
    rows: Array<any>
  }>
  games: Array<{ name: string; label: string; order: number }>
  selectedGame: { name: string; label: string; order: number } | null
}>()

const emit = defineEmits<{ 'select-game': [name: string] }>()

const sorts = ref<Record<string, Sort>>({})

function defaultSort(table: any): Sort {
  return { key: table.showLevel ? 'level' : 'move', dir: 'ascending' }
}

watch(
  () => props.tables,
  (tables) => {
    const next: Record<string, Sort> = {}
    for (const table of tables) next[table.method] = defaultSort(table)
    sorts.value = next
  },
  { immediate: true, deep: false },
)

function columnsFor(table: any) {
  return [
    ...(table.showLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]
}

function sortFor(table: any): Sort {
  return sorts.value[table.method] || defaultSort(table)
}

function sortBy(table: any, key: string) {
  const current = sortFor(table)
  const dir: Sort['dir'] = current.key === key && current.dir === 'ascending' ? 'descending' : 'ascending'
  sorts.value = { ...sorts.value, [table.method]: { key, dir } }
}

function isMissing(value: any) {
  return value === null || value === undefined || value === ''
}

function sortedRows(table: any) {
  const sort = sortFor(table)
  const numeric = ['level', 'power', 'accuracy', 'pp'].includes(sort.key)
  return [...table.rows].sort((a: any, b: any) => {
    const aValue = sort.key === 'move' ? a.move.label : sort.key === 'type' ? a.type.label : a[sort.key]
    const bValue = sort.key === 'move' ? b.move.label : sort.key === 'type' ? b.type.label : b[sort.key]
    const aMissing = isMissing(aValue)
    const bMissing = isMissing(bValue)
    if (aMissing && bMissing) return a.move.label.localeCompare(b.move.label)
    if (aMissing) return 1
    if (bMissing) return -1

    let comparison = numeric
      ? Number(aValue) - Number(bValue)
      : String(aValue).localeCompare(String(bValue))
    if (sort.dir === 'descending') comparison = -comparison
    if (comparison === 0) comparison = a.move.label.localeCompare(b.move.label)
    return comparison
  })
}

function displayNumber(value: any) {
  return isMissing(value) ? '—' : String(value)
}
</script>
