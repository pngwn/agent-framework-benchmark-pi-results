import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <>
      <title>Not found – Pokédex</title>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  )
}
