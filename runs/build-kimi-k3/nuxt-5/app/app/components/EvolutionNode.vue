<script setup>
defineProps({
  node: { type: Object, required: true },
})
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${node.name}`">{{ humanize(node.name) }}</NuxtLink>
    <ul v-if="node.children && node.children.length">
      <EvolutionNode v-for="child in node.children" :key="child.name" :node="child" />
    </ul>
  </li>
</template>
