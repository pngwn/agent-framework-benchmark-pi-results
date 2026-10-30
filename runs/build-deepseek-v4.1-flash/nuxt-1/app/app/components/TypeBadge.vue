<script setup lang="ts">
const props = defineProps<{
  type: { name: string; label: string }
  link?: boolean
}>()
</script>

<template>
  <NuxtLink v-if="props.link" :to="`/types/${type.name}`" :class="['type-badge', `type-${type.name}`]">
    {{ type.label }}
  </NuxtLink>
  <span v-else :class="['type-badge', `type-${type.name}`]">{{ type.label }}</span>
</template>
