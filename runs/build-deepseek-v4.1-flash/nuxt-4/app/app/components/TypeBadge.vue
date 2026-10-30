<script setup lang="ts">
const props = defineProps<{
  name: string
  label: string
  link?: boolean
}>()
</script>

<template>
  <NuxtLink
    v-if="props.link"
    :to="`/types/${props.name}`"
    class="type-badge"
    :class="`type-${props.name}`"
  >{{ props.label }}</NuxtLink>
  <span
    v-else
    class="type-badge"
    :class="`type-${props.name}`"
  >{{ props.label }}</span>
</template>
