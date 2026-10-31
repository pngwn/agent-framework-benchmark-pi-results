<script setup lang="ts">
import { setResponseStatus } from 'h3'

useHead({ title: 'Not found – Pokédex' })

const event = useRequestEvent()
if (event) setResponseStatus(event, 404)
</script>

<template>
  <NotFound />
</template>
