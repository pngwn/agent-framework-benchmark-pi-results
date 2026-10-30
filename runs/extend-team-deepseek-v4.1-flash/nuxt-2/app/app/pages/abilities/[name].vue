<script setup lang="ts">
interface AbilityData {
  name: string;
  label: string;
  effect: string | null;
  pokemon: { id: number; name: string; sprite: string; hidden?: boolean }[];
}
const route = useRoute();
const name = computed(() => String(route.params.name));
const ability = await usePageData<AbilityData>(
  () => `/api/abilities/${encodeURIComponent(name.value)}`,
  () => `ability:${name.value}`,
);
usePageTitle(() => ability.value?.label);
</script>

<template>
  <h1>{{ ability.label }}</h1>
  <PageSection title="Effect">
    <p>{{ orDash(ability.effect) }}</p>
  </PageSection>
  <PageSection title="Pokémon">
    <p class="count">{{ ability.pokemon.length }} Pokémon</p>
    <CardList :cards="ability.pokemon" />
  </PageSection>
</template>
