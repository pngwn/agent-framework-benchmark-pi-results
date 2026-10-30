<script setup lang="ts">
defineProps<{ cards: any[] }>()
</script>

<template>
  <ul class="pokemon-grid">
    <PokemonCard v-for="card in cards" :key="card.id" :card="card" />
  </ul>
</template>
