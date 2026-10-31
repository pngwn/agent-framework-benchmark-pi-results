<script setup lang="ts">
interface MoveRow {
  level: number
  moveName: string
  move: string
  type: { name: string; label: string } | null
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

const props = defineProps<{
  method: { name: string; label: string; hasLevel: boolean; rows: MoveRow[] }
}>()

const columns = computed(() => [
  ...(props.method.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
])

const sortKey = ref(props.method.hasLevel ? 'level' : 'move')
const sortDir = ref<'asc' | 'desc'>('asc')

function toggle(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function valueOf(row: MoveRow, key: string): string | number | null {
  switch (key) {
    case 'level':
      return row.level
    case 'move':
      return row.move
    case 'type':
      return row.type?.label ?? null
    case 'category':
      return row.category === '—' ? null : row.category
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
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.method.rows].sort((a, b) => {
    const av = valueOf(a, key)
    const bv = valueOf(b, key)
    // Missing values always sort last, in both directions.
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
    return dir * cmp
  })
})
</script>

<template>
  <table class="moves-table">
    <caption>{{ method.label }}</caption>
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          scope="col"
          :aria-sort="sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined"
        >
          <button type="button" class="th-button" @click="toggle(col.key)">{{ col.label }}</button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, i) in sortedRows" :key="`${row.moveName}-${row.level}-${i}`">
        <td v-if="method.hasLevel">{{ row.level }}</td>
        <td><NuxtLink :to="`/moves/${row.moveName}`">{{ row.move }}</NuxtLink></td>
        <td>
          <NuxtLink
            v-if="row.type"
            :to="`/types/${row.type.name}`"
            class="type-badge"
            :class="`type-${row.type.name}`"
          >{{ row.type.label }}</NuxtLink>
          <template v-else>—</template>
        </td>
        <td>{{ row.category }}</td>
        <td>{{ row.power ?? '—' }}</td>
        <td>{{ row.accuracy ?? '—' }}</td>
        <td>{{ row.pp ?? '—' }}</td>
      </tr>
    </tbody>
  </table>
</template>
