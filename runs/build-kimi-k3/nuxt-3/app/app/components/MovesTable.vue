<script setup lang="ts">
import type { MoveRow } from '~/utils/poke'

type SortKey = 'level' | 'name' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'

const props = defineProps<{
  caption: string
  rows: MoveRow[]
  hasLevel: boolean
}>()

const allColumns: { key: SortKey; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'name', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
]

const columns = computed(() => allColumns.filter((c) => props.hasLevel || c.key !== 'level'))

const sortKey = ref<SortKey>(props.hasLevel ? 'level' : 'name')
const sortDir = ref<'asc' | 'desc'>('asc')

function valueOf(row: MoveRow, key: SortKey): string | number | null {
  switch (key) {
    case 'level':
      return row.level
    case 'name':
      return row.nameEn
    case 'type':
      return row.typeEn
    case 'category':
      return row.category
    case 'power':
      return row.power
    case 'accuracy':
      return row.accuracy
    case 'pp':
      return row.pp
  }
}

const sortedRows = computed(() => {
  const rows = [...props.rows]
  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value
  rows.sort((a, b) => {
    const va = valueOf(a, key)
    const vb = valueOf(b, key)
    const ma = va === null
    const mb = vb === null
    // Missing values sort last in both directions.
    if (ma && mb) return 0
    if (ma) return 1
    if (mb) return -1
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return cmp * dir
  })
  return rows
})

function toggle(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
</script>

<template>
  <table class="moves-table">
    <caption>{{ caption }}</caption>
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          scope="col"
          :aria-sort="sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined"
        >
          <button type="button" class="th-sort" @click="toggle(col.key)">{{ col.label }}</button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="`${row.name}-${row.level}`">
        <td v-if="hasLevel">{{ row.level }}</td>
        <td>
          <NuxtLink :to="`/moves/${row.name}`">{{ row.nameEn }}</NuxtLink>
        </td>
        <td>
          <NuxtLink :to="`/types/${row.typeName}`" class="type-badge" :class="`type-${row.typeName}`">{{ row.typeEn }}</NuxtLink>
        </td>
        <td>{{ row.category }}</td>
        <td>{{ row.power ?? '—' }}</td>
        <td>{{ row.accuracy ?? '—' }}</td>
        <td>{{ row.pp ?? '—' }}</td>
      </tr>
    </tbody>
  </table>
</template>
