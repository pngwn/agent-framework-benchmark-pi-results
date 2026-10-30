<script setup lang="ts">
type MoveRow = {
  level: number
  moveName: string
  moveLabel: string
  typeName: string
  typeLabel: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

type Column = {
  key: keyof MoveRow
  label: string
}

const props = defineProps<{
  title: string
  method: string
  rows: MoveRow[]
}>()

const columns = computed<Column[]>(() => {
  const cols: Column[] = [
    { key: 'moveLabel', label: 'Move' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]
  if (props.method === 'level-up') {
    cols.unshift({ key: 'level', label: 'Level' })
  }
  return cols
})

const defaultKey = computed<keyof MoveRow>(() =>
  props.method === 'level-up' ? 'level' : 'moveLabel',
)
const sortKey = ref<keyof MoveRow>(defaultKey.value)
const sortDirection = ref<'ascending' | 'descending'>('ascending')

watch(
  () => props.rows,
  () => {
    sortKey.value = defaultKey.value
    sortDirection.value = 'ascending'
  },
)

function toggleSort(key: keyof MoveRow) {
  if (sortKey.value === key) {
    sortDirection.value =
      sortDirection.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortKey.value = key
    sortDirection.value = 'ascending'
  }
}

const isMissing = (value: unknown) =>
  value === null || value === undefined || value === ''

const sortedRows = computed(() => {
  const direction = sortDirection.value === 'ascending' ? 1 : -1
  const key = sortKey.value
  return [...props.rows].sort((a, b) => {
    const aValue = a[key]
    const bValue = b[key]
    const aMissing = isMissing(aValue)
    const bMissing = isMissing(bValue)

    if (aMissing || bMissing) {
      if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel)
      return aMissing ? 1 : -1
    }

    let comparison: number
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    if (comparison !== 0) return comparison * direction
    return a.moveLabel.localeCompare(b.moveLabel)
  })
})
</script>

<template>
  <table class="moves-table">
    <caption class="sr-only">{{ props.title }}</caption>
    <thead>
      <tr>
        <th
          v-for="column in columns"
          :key="column.key"
          scope="col"
          :aria-sort="sortKey === column.key ? sortDirection : undefined"
          @click="toggleSort(column.key)"
        >
          <button type="button" class="sort-button">
            {{ column.label }}
          </button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="`${row.moveName}-${row.level}`">
        <td v-if="props.method === 'level-up'">{{ row.level }}</td>
        <td>
          <NuxtLink :to="`/moves/${row.moveName}`">{{ row.moveLabel }}</NuxtLink>
        </td>
        <td>
          <TypeBadge :name="row.typeName" :label="row.typeLabel" link />
        </td>
        <td>{{ row.category || '—' }}</td>
        <td>{{ displayValue(row.power) }}</td>
        <td>{{ displayValue(row.accuracy) }}</td>
        <td>{{ displayValue(row.pp) }}</td>
      </tr>
    </tbody>
  </table>
</template>
