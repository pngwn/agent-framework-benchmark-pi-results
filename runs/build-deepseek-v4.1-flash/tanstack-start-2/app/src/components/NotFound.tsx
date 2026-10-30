import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <main>
      <div className="container page">
        <h1>Not found</h1>
        <Link className="not-found-link" to="/">Back to the Pokédex</Link>
      </div>
    </main>
  )
}
