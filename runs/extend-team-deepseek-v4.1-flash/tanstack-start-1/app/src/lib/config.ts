import { useLoaderData } from '@tanstack/react-router'

// Origin of the API server (sprites live under /media/ there), provided by the root loader.
export function useMediaBase(): string {
  return useLoaderData({ from: '__root__' }).mediaBase
}
