<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);
const heading = computed(() => (notFound.value ? 'Not found' : 'Something went wrong'));
usePageTitle(heading);
</script>

<template>
  <SiteHeader />
  <main class="container">
    <h1>{{ heading }}</h1>
    <p><NuxtLink to="/" @click.prevent="clearError({ redirect: '/' })">Back to the Pokédex</NuxtLink></p>
  </main>
  <SiteFooter />
</template>
