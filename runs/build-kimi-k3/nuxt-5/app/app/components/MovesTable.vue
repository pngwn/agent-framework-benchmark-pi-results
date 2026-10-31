<script setup>
const props = defineProps({
  table: { type: Object, required: true },
})

const sort = ref({ key: null, dir: 'asc' })

const hasLevel = computed(() => props.table.method === 'level-up')

const columns = computed(() => {
  const cols = []
  if (hasLevel.value) cols.push({ key: 'level', label: 'Level' })
  cols.push(
    { key: 'moveEn', label: 'Move' },
    { key: 'typeEn', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  )
  return cols
})

function toggleSort(col) {
  if (sort.value.key === col.key) {
    sort.value = { key: col.key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    sort.value = { key: col.key, dir: 'asc' }
  }
}

function ariaSort(col) {
  if (sort.value.key !== col.key) return undefined
  return sort.value.dir === 'asc' ? 'ascending' : 'descending'
}

// Missing values always sort last, in both directions.
const rows = computed(() => {
  const { key, dir } = sort.value
  if (!key) return props.table.rows
  const mul = dir === 'asc' ? 1 : -1
  return [...props.table.rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return c * mul
  })
})
</script>

<template>
  <div class="table-wrap">
    <table class="moves-table">
      <caption>{{ table.label }}</caption>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" scope="col" :aria-sort="ariaSort(col)">
            <button type="button" class="sort-button" @click="toggleSort(col)">
              {{ col.label }}<span v-if="sort.key === col.key" aria-hidden="true">{{ sort.dir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.moveName">
          <td v-if="hasLevel">{{ row.level }}</td>
          <td><NuxtLink :to="`/moves/${row.moveName}`">{{ row.moveEn }}</NuxtLink></td>
          <td>
            <TypeBadge v-if="row.type" :name="row.type" :label="row.typeEn" />
            <template v-else>—</template>
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
