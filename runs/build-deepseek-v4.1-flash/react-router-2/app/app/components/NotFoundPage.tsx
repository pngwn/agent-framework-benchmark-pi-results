import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </div>
  );
}
