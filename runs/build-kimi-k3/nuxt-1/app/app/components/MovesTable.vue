<script setup>
const props = defineProps({
  label: { type: String, required: true }, // humanized learn method, used as the table's accessible name
  rows: { type: Array, required: true },
  showLevel: { type: Boolean, default: false },
})

const columns = computed(() => {
  const cols = [
    ...(props.showLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'label', label: 'Move' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]
  return cols
})

const sortKey = ref(null)
const sortDir = ref('ascending')

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'ascending' ? 'descending' : 'ascending'
  } else {
    sortKey.value = key
    sortDir.value = 'ascending'
  }
}

// Missing values sort last in both directions.
const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  const key = sortKey.value
  const dir = sortDir.value === 'ascending' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    const aMissing = va === null || va === undefined
    const bMissing = vb === null || vb === undefined
    if (aMissing && bMissing) return 0
    if (aMissing) return 1
    if (bMissing) return -1
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return cmp * dir
  })
})

const fmt = (v) => (v === null || v === undefined ? '—' : v)
</script>

<template>
  <table class="moves-table">
    <caption>{{ label }}</caption>
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          scope="col"
          :aria-sort="sortKey === col.key ? sortDir : undefined"
        >
          <button type="button" @click="toggleSort(col.key)">{{ col.label }}</button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, i) in sortedRows" :key="i">
        <td v-if="showLevel">{{ row.level }}</td>
        <td><NuxtLink :to="`/moves/${row.move}`">{{ row.label }}</NuxtLink></td>
        <td>
          <NuxtLink v-if="row.type" :to="`/types/${row.type}`" class="type-badge" :class="`type-${row.type}`">
            {{ row.typeLabel }}
          </NuxtLink>
          <template v-else>—</template>
        </td>
        <td>{{ fmt(row.category) }}</td>
        <td>{{ fmt(row.power) }}</td>
        <td>{{ fmt(row.accuracy) }}</td>
        <td>{{ fmt(row.pp) }}</td>
      </tr>
    </tbody>
  </table>
</template>
