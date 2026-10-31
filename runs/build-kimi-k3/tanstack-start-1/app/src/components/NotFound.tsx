import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="not-found">
      <h1>Not found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </div>
  )
}
