<template>
  <span class="type-badge" :style="{ backgroundColor: `var(--type-${type.name})` }">{{ type.label }}</span>
</template>

<script setup lang="ts">
defineProps<{
  type: { name: string; label: string }
}>()
</script>
