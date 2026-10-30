<script setup lang="ts">
defineProps<{
  cards: { id: number; name: string; sprite: string; hidden?: boolean; types?: { name: string; label: string }[] }[];
}>();
</script>

<template>
  <ul class="card-grid">
    <li v-for="c in cards" :key="c.id">
      <PokemonCard v-bind="c" />
    </li>
  </ul>
</template>
