import { Link } from "react-router";

export function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
