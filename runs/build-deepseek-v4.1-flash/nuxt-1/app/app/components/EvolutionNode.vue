<script setup lang="ts">
defineProps<{
  node: {
    name: string
    label: string
    children: any[]
  }
}>()
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${node.name}`">{{ node.label }}</NuxtLink>
    <ul v-if="node.children.length" class="evolution-list">
      <EvolutionNode v-for="child in node.children" :key="child.name" :node="child" />
    </ul>
  </li>
</template>
