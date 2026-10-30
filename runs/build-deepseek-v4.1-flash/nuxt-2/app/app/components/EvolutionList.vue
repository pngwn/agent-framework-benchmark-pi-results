<script setup lang="ts">
defineProps<{ nodes: any[] }>()
</script>

<template>
  <ul class="evolution-list">
    <li v-for="node in nodes" :key="node.slug">
      <NuxtLink :to="`/pokemon/${node.slug}`">{{ node.label }}</NuxtLink>
      <EvolutionList v-if="node.children?.length" :nodes="node.children" />
    </li>
  </ul>
</template>
