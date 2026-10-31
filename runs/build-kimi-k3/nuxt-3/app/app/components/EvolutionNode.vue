<script setup lang="ts">
import type { EvolutionTreeNode } from '~/utils/poke'

defineProps<{ node: EvolutionTreeNode }>()
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${node.name}`">{{ humanize(node.name) }}</NuxtLink>
    <ul v-if="node.children.length">
      <EvolutionNode v-for="child in node.children" :key="child.name" :node="child" />
    </ul>
  </li>
</template>
