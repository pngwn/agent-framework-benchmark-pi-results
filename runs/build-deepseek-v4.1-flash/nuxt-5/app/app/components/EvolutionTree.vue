<template>
  <ul class="evolution-list">
    <li>
      <NuxtLink :to="`/pokemon/${node.name}`">{{ node.displayName }}</NuxtLink>
      <EvolutionTree
        v-for="child in node.children"
        :key="child.name"
        :node="child"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
defineProps<{
  node: {
    name: string
    displayName: string
    children: Array<any>
  }
}>()
</script>
