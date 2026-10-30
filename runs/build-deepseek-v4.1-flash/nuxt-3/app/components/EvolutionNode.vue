<template>
  <li>
    <NuxtLink v-if="node" :to="`/pokemon/${node.speciesName}`">{{ node.name }}</NuxtLink>
    <ul v-if="node?.children?.length">
      <EvolutionNode v-for="child in node.children" :key="child.speciesName" :node="child" />
    </ul>
  </li>
</template>

<script setup lang="ts">
defineProps<{
  node: {
    speciesName: string
    name: string
    children: Array<any>
  }
}>()
</script>
