<script setup lang="ts">
defineProps<{
  id: number;
  name: string;
  sprite: string;
  types?: { name: string; label: string }[];
  hidden?: boolean;
}>();
</script>

<template>
  <NuxtLink :to="`/pokemon/${name}`" class="card">
    <img :src="sprite" alt="" width="96" height="96" class="card__sprite" />
    <span class="card__dex">{{ dexNumber(id) }}</span>
    <span class="card__name">{{ humanize(name) }}</span>
    <span v-if="types?.length" class="card__types">
      <TypeBadge v-for="t in types" :key="t.name" :name="t.name" :label="t.label" />
    </span>
    <span v-if="hidden" class="card__note">Hidden ability</span>
  </NuxtLink>
</template>
