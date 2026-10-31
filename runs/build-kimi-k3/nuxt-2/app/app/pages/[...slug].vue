<script setup lang="ts">
import { setResponseStatus } from 'h3'

const requestEvent = useRequestEvent()
if (requestEvent) setResponseStatus(requestEvent, 404)
</script>

<template>
  <NotFound />
</template>
