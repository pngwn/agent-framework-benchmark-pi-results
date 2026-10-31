<script setup lang="ts">
import { humanize } from '~/lib/pokeapi'

defineProps<{
  node: {
    species: { name: string; url: string }
    evolves_to?: any[]
  }
}>()
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${node.species.name}`">{{ humanize(node.species.name) }}</NuxtLink>
    <ul v-if="node.evolves_to && node.evolves_to.length">
      <EvoNode v-for="child in node.evolves_to" :key="child.species.name" :node="child" />
    </ul>
  </li>
</template>
