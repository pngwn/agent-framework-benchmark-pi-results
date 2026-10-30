import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="page">
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </div>
  )
}
