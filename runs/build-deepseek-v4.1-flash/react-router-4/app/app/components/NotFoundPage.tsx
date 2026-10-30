import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <>
      <h1>Not found</h1>
      <div className="not-found-link">
        <Link to="/">Back to the Pokédex</Link>
      </div>
    </>
  );
}
