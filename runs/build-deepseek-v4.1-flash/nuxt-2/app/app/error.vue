<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ error: any }>()

useHead({
  title: computed(() => props.error?.statusCode === 404 ? 'Not found – Pokédex' : 'Error – Pokédex'),
  htmlAttrs: { lang: 'en' },
})
</script>

<template>
  <NuxtLayout>
    <div class="not-found">
      <h1 class="page-title">{{ error?.statusCode === 404 ? 'Not found' : 'Error' }}</h1>
      <p><NuxtLink to="/">Back to the Pokédex</NuxtLink></p>
    </div>
  </NuxtLayout>
</template>
