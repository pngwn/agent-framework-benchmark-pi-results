<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  method: {
    name: string
    label: string
    rows: Array<any>
  }
}>()

type Column = { key: string; label: string }

const columns = computed<Column[]>(() => {
  const list: Column[] = []
  if (props.method.name === 'level-up') list.push({ key: 'level', label: 'Level' })
  list.push(
    { key: 'label', label: 'Move' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'categoryLabel', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  )
  return list
})

const sortKey = ref(props.method.name === 'level-up' ? 'level' : 'label')
const sortDirection = ref<'ascending' | 'descending'>('ascending')

function valueFor(row: any, key: string) {
  if (key === 'typeLabel') return row.type?.label
  if (key === 'categoryLabel') return row.category?.label
  return row[key]
}

function isMissing(value: any) {
  return value === null || value === undefined || value === ''
}

function compareRows(a: any, b: any) {
  const key = sortKey.value
  const aValue = valueFor(a, key)
  const bValue = valueFor(b, key)
  const aMissing = isMissing(aValue)
  const bMissing = isMissing(bValue)
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return a.label.localeCompare(b.label)
    return aMissing ? 1 : -1
  }

  let result = 0
  if (key === 'level' || key === 'power' || key === 'accuracy' || key === 'pp') {
    result = Number(aValue) - Number(bValue)
  } else {
    result = String(aValue).localeCompare(String(bValue))
  }
  if (sortDirection.value === 'descending') result *= -1
  return result || a.label.localeCompare(b.label)
}

const sortedRows = computed(() => [...props.method.rows].sort(compareRows))

function clickHeader(column: Column) {
  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortKey.value = column.key
    sortDirection.value = 'ascending'
  }
}

function display(value: any) {
  return isMissing(value) ? '—' : String(value)
}
</script>

<template>
  <table class="move-table">
    <caption>{{ method.label }}</caption>
    <thead>
      <tr>
        <th
          v-for="column in columns"
          :key="column.key"
          scope="col"
          :aria-sort="sortKey === column.key ? sortDirection : undefined"
        >
          <button type="button" @click="clickHeader(column)">{{ column.label }}</button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sortedRows" :key="`${row.name}-${row.level}`">
        <td v-if="method.name === 'level-up'">{{ row.level }}</td>
        <td><NuxtLink :to="`/moves/${row.name}`">{{ row.label }}</NuxtLink></td>
        <td><TypeBadge :type="row.type" link /></td>
        <td>{{ row.category.label }}</td>
        <td>{{ display(row.power) }}</td>
        <td>{{ display(row.accuracy) }}</td>
        <td>{{ display(row.pp) }}</td>
      </tr>
    </tbody>
  </table>
</template>
