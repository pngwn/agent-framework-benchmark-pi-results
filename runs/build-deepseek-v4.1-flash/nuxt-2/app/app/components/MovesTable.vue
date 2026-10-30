<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ table: any }>()

type Direction = 'ascending' | 'descending'

const sortKey = ref<string | null>(null)
const sortDirection = ref<Direction>('ascending')

watch(() => props.table, () => {
  sortKey.value = null
  sortDirection.value = 'ascending'
})

const columns = computed(() => {
  const list: { key: string; label: string }[] = []
  if (props.table.hasLevel) list.push({ key: 'level', label: 'Level' })
  list.push(
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  )
  return list
})

const fieldFor = (key: string) => ({
  level: 'level',
  move: 'moveName',
  type: 'typeName',
  category: 'category',
  power: 'power',
  accuracy: 'accuracy',
  pp: 'pp',
}[key] ?? key)

const isMissing = (value: any) => value === null || value === undefined || value === '' || value === '—'

function compare(a: any, b: any, key: string) {
  const field = fieldFor(key)
  const aValue = a[field]
  const bValue = b[field]
  const aMissing = isMissing(aValue)
  const bMissing = isMissing(bValue)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1

  let result = 0
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    result = aValue - bValue
  } else {
    result = String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' })
  }
  return sortDirection.value === 'ascending' ? result : -result
}

const rows = computed(() => {
  const list = [...(props.table.rows ?? [])]
  if (!sortKey.value) return list
  return list.sort((a, b) => compare(a, b, sortKey.value!))
})

function ariaSort(key: string) {
  return sortKey.value === key ? sortDirection.value : undefined
}

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortKey.value = key
    sortDirection.value = 'ascending'
  }
}
</script>

<template>
  <div class="moves-table-wrap">
    <table class="moves-table">
      <caption>{{ table.label }}</caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="ariaSort(column.key)"
          >
            <button type="button" @click="sortBy(column.key)">{{ column.label }}</button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="`${row.method}-${row.moveSlug}-${row.level}-${index}`">
          <td v-if="table.hasLevel">{{ row.level ?? '—' }}</td>
          <td>
            <NuxtLink :to="`/moves/${row.moveSlug}`">{{ row.moveName }}</NuxtLink>
          </td>
          <td>
            <TypeBadge :name="row.typeName" :slug="row.typeSlug" link small />
          </td>
          <td>{{ row.category }}</td>
          <td>{{ row.power ?? '—' }}</td>
          <td>{{ row.accuracy ?? '—' }}</td>
          <td>{{ row.pp ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
