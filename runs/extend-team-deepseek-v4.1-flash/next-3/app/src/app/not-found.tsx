import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
