<script setup lang="ts">
defineProps<{ name: string; label: string; link?: boolean; large?: boolean }>();
</script>

<template>
  <NuxtLink
    v-if="link"
    :to="`/types/${name}`"
    class="type-badge"
    :class="{ 'type-badge--large': large }"
    :style="{ '--type-color': `var(--type-${name})` }"
    >{{ label }}</NuxtLink
  >
  <span
    v-else
    class="type-badge"
    :class="{ 'type-badge--large': large }"
    :style="{ '--type-color': `var(--type-${name})` }"
    >{{ label }}</span
  >
</template>
