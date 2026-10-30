import Link from 'next/link';

export default function NotFoundContent() {
  return (
    <div>
      <h1>Not found</h1>
      <p className="not-found-link">
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </div>
  );
}
