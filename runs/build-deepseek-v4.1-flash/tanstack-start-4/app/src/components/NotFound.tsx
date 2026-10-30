import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="container page not-found">
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </main>
  )
}
