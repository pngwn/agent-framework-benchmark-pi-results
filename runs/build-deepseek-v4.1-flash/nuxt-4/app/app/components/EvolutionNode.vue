<script setup lang="ts">
const props = defineProps<{
  node: {
    id: number | null
    name: string
    humanized: string
    evolvesTo: any[]
  }
}>()
</script>

<template>
  <li>
    <NuxtLink :to="`/pokemon/${props.node.name}`">{{ props.node.humanized }}</NuxtLink>
    <ul v-if="props.node.evolvesTo?.length">
      <EvolutionNode
        v-for="child in props.node.evolvesTo"
        :key="child.name"
        :node="child"
      />
    </ul>
  </li>
</template>
