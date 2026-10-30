<script setup lang="ts">
interface IndexData {
  types: { name: string; label: string }[];
  generations: { name: string; label: string }[];
  species: { id: number; name: string; types: string[]; generation: string | null }[];
}

const PAGE_SIZE = 48;

usePageTitle(undefined);
const route = useRoute();
const router = useRouter();
const data = await usePageData<IndexData>(
  () => '/api/species',
  () => 'index',
);
const config = useRuntimeConfig();
const mediaBase = String(config.public.apiBase).replace(/\/$/, '');

const param = (key: string) => {
  const v = route.query[key];
  return String((Array.isArray(v) ? v[0] : v) ?? '');
};
const q = computed(() => param('q'));
const type = computed(() => param('type'));
const generation = computed(() => param('generation'));

const typeLabels = computed(() => Object.fromEntries(data.value.types.map((t) => [t.name, t.label])));

const matches = computed(() => {
  const needle = q.value.trim().toLowerCase();
  return data.value.species.filter(
    (s) =>
      (!needle || humanize(s.name).toLowerCase().includes(needle)) &&
      (!type.value || s.types.includes(type.value)) &&
      (!generation.value || s.generation === generation.value),
  );
});
const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / PAGE_SIZE)));
const page = computed(() => {
  const n = parseInt(param('page'), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), totalPages.value) : 1;
});
const cards = computed(() =>
  matches.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE).map((s) => ({
    id: s.id,
    name: s.name,
    sprite: `${mediaBase}/media/sprites/pokemon/${s.id}.png`,
    types: s.types.map((t) => ({ name: t, label: typeLabels.value[t] ?? humanize(t) })),
  })),
);

function buildQuery(values: { q?: string; type?: string; generation?: string; page?: number }) {
  const query: Record<string, string> = {};
  if (values.q) query.q = values.q;
  if (values.type) query.type = values.type;
  if (values.generation) query.generation = values.generation;
  if (values.page && values.page > 1) query.page = String(values.page);
  return query;
}
const current = () => ({ q: q.value, type: type.value, generation: generation.value });
const pageLink = (n: number) => ({ path: '/', query: buildQuery({ ...current(), page: n }) });

function setFilter(patch: { q?: string; type?: string; generation?: string }) {
  router.replace({ path: '/', query: buildQuery({ ...current(), ...patch }) });
}

// The search box updates the URL shortly after typing stops.
const search = ref(q.value);
watch(q, (v) => {
  if (v !== search.value) search.value = v;
});
let timer: ReturnType<typeof setTimeout> | undefined;
function onSearch(event: Event) {
  search.value = (event.target as HTMLInputElement).value;
  clearTimeout(timer);
  timer = setTimeout(() => setFilter({ q: search.value }), 150);
}
onBeforeUnmount(() => clearTimeout(timer));

// Pick up anything typed before hydration finished.
const searchInput = ref<HTMLInputElement>();
onMounted(() => {
  const typed = searchInput.value?.value ?? '';
  if (typed !== search.value) onSearch({ target: searchInput.value } as unknown as Event);
});
</script>

<template>
  <h1>Pokémon</h1>
  <form class="filters" role="search" @submit.prevent>
    <div class="field field--search">
      <label for="search">Search</label>
      <input id="search" ref="searchInput" type="search" :value="search" autocomplete="off" @input="onSearch" />
    </div>
    <div class="field">
      <label for="type">Type</label>
      <select id="type" :value="type" @change="setFilter({ type: ($event.target as HTMLSelectElement).value })">
        <option value="" :selected="!type">All types</option>
        <option v-for="t in data.types" :key="t.name" :value="t.name" :selected="t.name === type">{{ t.label }}</option>
      </select>
    </div>
    <div class="field">
      <label for="generation">Generation</label>
      <select
        id="generation"
        :value="generation"
        @change="setFilter({ generation: ($event.target as HTMLSelectElement).value })"
      >
        <option value="" :selected="!generation">All generations</option>
        <option v-for="g in data.generations" :key="g.name" :value="g.name" :selected="g.name === generation">{{ g.label }}</option>
      </select>
    </div>
  </form>

  <template v-if="matches.length">
    <p class="count">{{ matches.length }} Pokémon</p>
    <CardList :cards="cards" />
    <nav class="pagination" aria-label="Pagination">
      <NuxtLink v-if="page > 1" :to="pageLink(page - 1)">Previous page</NuxtLink>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <NuxtLink v-if="page < totalPages" :to="pageLink(page + 1)">Next page</NuxtLink>
    </nav>
  </template>
  <p v-else class="empty">No Pokémon found</p>
</template>
