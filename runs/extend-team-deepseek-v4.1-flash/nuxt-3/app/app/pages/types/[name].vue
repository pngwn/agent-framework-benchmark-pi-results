<script setup lang="ts">
interface TypeData {
  name: string;
  label: string;
  relations: { label: string; types: { name: string; label: string }[] }[];
  pokemon: { id: number; name: string; sprite: string }[];
  moves: { name: string; label: string }[];
}
const route = useRoute();
const name = computed(() => String(route.params.name));
const type = await usePageData<TypeData>(
  () => `/api/types/${encodeURIComponent(name.value)}`,
  () => `type:${name.value}`,
);
usePageTitle(() => type.value?.label);
</script>

<template>
  <h1>{{ type.label }}</h1>
  <PageSection title="Damage relations">
    <dl class="relations">
      <div v-for="r in type.relations" :key="r.label" class="relations__item">
        <dt>{{ r.label }}</dt>
        <dd>
          <template v-if="r.types.length">
            <TypeBadge v-for="t in r.types" :key="t.name" :name="t.name" :label="t.label" link />
          </template>
          <template v-else>None</template>
        </dd>
      </div>
    </dl>
  </PageSection>
  <PageSection title="Pokémon">
    <p class="count">{{ type.pokemon.length }} Pokémon</p>
    <CardList :cards="type.pokemon" />
  </PageSection>
  <PageSection title="Moves">
    <p class="count">{{ type.moves.length }} moves</p>
    <ul class="link-columns">
      <li v-for="m in type.moves" :key="m.name">
        <NuxtLink :to="`/moves/${m.name}`">{{ m.label }}</NuxtLink>
      </li>
    </ul>
  </PageSection>
</template>
