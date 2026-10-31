import { createFileRoute } from '@tanstack/react-router'
import { NotFound } from '~/components/NotFound'

export const Route = createFileRoute('/$')({
  head: () => ({ meta: [{ title: 'Not found – Pokédex' }] }),
  component: NotFound,
})
