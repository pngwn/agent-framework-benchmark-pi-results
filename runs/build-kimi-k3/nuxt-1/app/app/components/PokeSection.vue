<script setup>
const props = defineProps({
  title: { type: String, required: true },
  id: { type: String, default: null },
})

const headingId = computed(() => `${props.id ?? props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`)
</script>

<template>
  <section :id="id ?? undefined" :aria-labelledby="headingId" class="section-card">
    <h2 :id="headingId" class="section-title">{{ title }}</h2>
    <slot />
  </section>
</template>
