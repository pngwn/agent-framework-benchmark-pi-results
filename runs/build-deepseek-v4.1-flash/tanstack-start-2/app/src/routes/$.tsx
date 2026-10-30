import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '../components/NotFound'

export const Route = createFileRoute('/$')({
  head: () => ({ meta: [{ title: 'Not found – Pokédex' }] }),
  component: NotFoundPage,
})
