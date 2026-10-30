import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <>
      <h1>Not found</h1>
      <p className="not-found-link">
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  )
}
