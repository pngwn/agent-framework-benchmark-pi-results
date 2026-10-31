<script setup>
import { humanize } from '#shared/utils/format'

defineProps({
  node: { type: Object, required: true }, // { name, children: [] }
})
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${node.name}`">{{ humanize(node.name) }}</NuxtLink>
    <ul v-if="node.children?.length" class="bullet-list">
      <EvolutionNode v-for="child in node.children" :key="child.name" :node="child" />
    </ul>
  </li>
</template>
