<script setup lang="ts">
const props = defineProps<{ title: string; id?: string }>();
const headingId = `${props.id ?? props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;
</script>

<template>
  <section :id="id" class="panel" :aria-labelledby="headingId">
    <h2 :id="headingId">{{ title }}</h2>
    <slot />
  </section>
</template>
