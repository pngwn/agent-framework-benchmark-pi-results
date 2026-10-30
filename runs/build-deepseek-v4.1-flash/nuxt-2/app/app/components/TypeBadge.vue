<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  slug?: string
  link?: boolean
  small?: boolean
}>(), {
  slug: '',
  link: false,
  small: false,
})

const badgeStyle = computed(() => ({
  backgroundColor: `var(--type-${props.slug}, var(--color-text-muted))`,
}))

const classes = computed(() => ({
  'type-badge': true,
  'type-badge--small': props.small,
}))
</script>

<template>
  <NuxtLink
    v-if="link"
    :to="`/types/${slug}`"
    :class="classes"
    :style="badgeStyle"
  >
    {{ name }}
  </NuxtLink>
  <span v-else :class="classes" :style="badgeStyle">{{ name }}</span>
</template>
