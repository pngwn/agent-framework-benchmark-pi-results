<template>
  <table class="data-table moves-table">
    <caption>{{ methodLabel }}</caption>
    <thead>
      <tr>
        <th
          v-for="column in columns"
          :key="column.key"
          scope="col"
          :aria-sort="sortKey === column.key ? sortDirection : undefined"
        >
          <button type="button" class="sort-button" @click="toggleSort(column.key)">
            {{ column.label }}
          </button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in sortedRows" :key="`${row.moveName}-${row.method}-${row.level}-${index}`">
        <td v-if="showLevel" class="numeric">{{ row.level }}</td>
        <td>
          <NuxtLink :to="`/moves/${row.moveName}`">{{ row.moveLabel }}</NuxtLink>
        </td>
        <td>
          <NuxtLink :to="`/types/${row.typeName}`" class="type-link">
            <TypeBadge :type="{ name: row.typeName, label: row.typeLabel }" />
          </NuxtLink>
        </td>
        <td>{{ row.categoryLabel }}</td>
        <td class="numeric">{{ formatValue(row.power) }}</td>
        <td class="numeric">{{ formatValue(row.accuracy) }}</td>
        <td class="numeric">{{ formatValue(row.pp) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  method: string
  methodLabel: string
  rows: Array<Record<string, any>>
}>()

type Column = { key: string; label: string; numeric?: boolean }

const showLevel = computed(() => props.method === 'level-up')

const columns = computed<Column[]>(() => [
  ...(showLevel.value ? [{ key: 'level', label: 'Level', numeric: true }] : []),
  { key: 'moveLabel', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'categoryLabel', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
])

const sortKey = ref<string | null>(null)
const sortDirection = ref<'ascending' | 'descending'>('ascending')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortKey.value = key
    sortDirection.value = 'ascending'
  }
}

function isMissing(value: any) {
  return value === null || value === undefined || value === ''
}

function fallbackCompare(a: Record<string, any>, b: Record<string, any>) {
  if (showLevel.value && a.level !== b.level) return Number(a.level) - Number(b.level)
  return String(a.moveLabel).localeCompare(String(b.moveLabel))
}

const sortedRows = computed(() => {
  const rows = props.rows.slice()
  const key = sortKey.value
  if (!key) {
    return rows.sort((a, b) => {
      if (showLevel.value && Number(a.level) !== Number(b.level)) {
        return Number(a.level) - Number(b.level)
      }
      return String(a.moveLabel).localeCompare(String(b.moveLabel))
    })
  }

  const column = columns.value.find((item) => item.key === key)
  return rows.sort((a, b) => {
    const aMissing = isMissing(a[key])
    const bMissing = isMissing(b[key])
    if (aMissing && bMissing) return fallbackCompare(a, b)
    if (isMissing(a[key])) return 1
    if (isMissing(b[key])) return -1
    const comparison = column?.numeric
      ? Number(a[key]) - Number(b[key])
      : String(a[key]).localeCompare(String(b[key]))
    if (comparison === 0) return fallbackCompare(a, b)
    return sortDirection.value === 'ascending' ? comparison : -comparison
  })
})

function formatValue(value: any) {
  return isMissing(value) ? '—' : String(value)
}
</script>
