import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link href="/" className="not-found-link">
          Back to the Pokédex
        </Link>
      </p>
    </>
  );
}
