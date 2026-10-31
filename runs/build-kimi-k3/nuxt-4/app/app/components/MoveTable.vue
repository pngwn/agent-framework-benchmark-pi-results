<script setup lang="ts">
interface MoveRow {
  key: string
  level: number
  move: { name: string; english: string }
  type: { name: string; english: string }
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

const props = defineProps<{
  label: string
  showLevel: boolean
  rows: MoveRow[]
}>()

const columns = computed(() => [
  ...(props.showLevel ? [{ key: 'level', label: 'Level' }] : []),
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
])

const sortKey = ref<string | null>(null)
const sortAsc = ref(true)

function toggleSort(key: string) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function valueOf(row: MoveRow, key: string): number | string | null {
  switch (key) {
    case 'level':
      return row.level
    case 'move':
      return row.move.english
    case 'type':
      return row.type.english
    case 'category':
      return row.category
    case 'power':
      return row.power
    case 'accuracy':
      return row.accuracy
    case 'pp':
      return row.pp
    default:
      return null
  }
}

const sortedRows = computed(() => {
  const key = sortKey.value
  if (!key) return props.rows
  return [...props.rows].sort((a, b) => {
    const va = valueOf(a, key)
    const vb = valueOf(b, key)
    const missingA = va === null || va === undefined
    const missingB = vb === null || vb === undefined
    if (missingA && missingB) return 0
    if (missingA) return 1 // missing values sort last in both directions
    if (missingB) return -1
    const cmp =
      typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortAsc.value ? cmp : -cmp
  })
})

const show = (v: number | null) => (v === null || v === undefined ? '—' : v)
</script>

<template>
  <table class="move-table">
    <caption>{{ label }}</caption>
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          scope="col"
          :aria-sort="sortKey === col.key ? (sortAsc ? 'ascending' : 'descending') : null"
        >
          <button type="button" class="sort-btn" @click="toggleSort(col.key)">{{ col.label }}</button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="row.key">
        <td v-if="showLevel">{{ row.level }}</td>
        <td>
          <NuxtLink :to="`/moves/${row.move.name}`">{{ row.move.english }}</NuxtLink>
        </td>
        <td>
          <NuxtLink
            :to="`/types/${row.type.name}`"
            class="badge"
            :style="{ backgroundColor: `var(--type-${row.type.name}, var(--color-text-muted))` }"
          >
            {{ row.type.english }}
          </NuxtLink>
        </td>
        <td>{{ row.category }}</td>
        <td>{{ show(row.power) }}</td>
        <td>{{ show(row.accuracy) }}</td>
        <td>{{ show(row.pp) }}</td>
      </tr>
    </tbody>
  </table>
</template>
