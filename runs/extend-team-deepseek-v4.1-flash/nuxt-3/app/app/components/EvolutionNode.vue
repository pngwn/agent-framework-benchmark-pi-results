<script setup lang="ts">
export interface ChainNode {
  name: string;
  label: string;
  children: ChainNode[];
}
defineProps<{ node: ChainNode; current: string }>();
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${node.name}`" :aria-current="node.name === current ? 'page' : undefined">{{ node.label }}</NuxtLink>
    <ul v-if="node.children.length">
      <EvolutionNode v-for="child in node.children" :key="child.name" :node="child" :current="current" />
    </ul>
  </li>
</template>
