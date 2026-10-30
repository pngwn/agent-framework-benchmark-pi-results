import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Not found</h1>
      <p>
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </div>
  );
}
