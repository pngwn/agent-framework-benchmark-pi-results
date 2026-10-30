<script setup lang="ts">
export interface MoveRow {
  name: string;
  label: string;
  level: number | null;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}
type Key = 'level' | 'label' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';

const props = defineProps<{ caption: string; rows: MoveRow[]; showLevel?: boolean }>();

const columns = computed(() =>
  (
    [
      { key: 'level', label: 'Level' },
      { key: 'label', label: 'Move' },
      { key: 'typeLabel', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'power', label: 'Power' },
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'pp', label: 'PP' },
    ] as { key: Key; label: string }[]
  ).filter((c) => props.showLevel || c.key !== 'level'),
);

const sortKey = ref<Key | null>(null);
const sortDir = ref<'ascending' | 'descending'>('ascending');

function sortBy(key: Key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'ascending' ? 'descending' : 'ascending';
  else {
    sortKey.value = key;
    sortDir.value = 'ascending';
  }
}

const sorted = computed(() => {
  const key = sortKey.value;
  if (!key) return props.rows;
  const dir = sortDir.value === 'ascending' ? 1 : -1;
  return [...props.rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    const missingX = x === null || x === undefined;
    const missingY = y === null || y === undefined;
    if (missingX || missingY) return missingX === missingY ? a.label.localeCompare(b.label) : missingX ? 1 : -1;
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return cmp * dir || a.label.localeCompare(b.label);
  });
});
</script>

<template>
  <div class="table-scroll">
    <table class="moves-table">
      <caption>{{ caption }}</caption>
      <thead>
        <tr>
          <th
            v-for="c in columns"
            :key="c.key"
            scope="col"
            :aria-sort="sortKey === c.key ? sortDir : undefined"
          >
            <button type="button" class="sort-button" @click="sortBy(c.key)">
              {{ c.label }}<span v-if="sortKey === c.key" aria-hidden="true" class="sort-indicator">{{ sortDir === 'ascending' ? '▲' : '▼' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in sorted" :key="`${r.name}:${r.level}`">
          <td v-if="showLevel">{{ orDash(r.level) }}</td>
          <td><NuxtLink :to="`/moves/${r.name}`">{{ r.label }}</NuxtLink></td>
          <td><TypeBadge :name="r.type" :label="r.typeLabel" link /></td>
          <td>{{ orDash(r.category) }}</td>
          <td>{{ orDash(r.power) }}</td>
          <td>{{ orDash(r.accuracy) }}</td>
          <td>{{ orDash(r.pp) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
