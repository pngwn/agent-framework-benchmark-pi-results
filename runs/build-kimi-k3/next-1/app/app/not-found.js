import Link from 'next/link';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <>
      <h1 className="page-title">Not found</h1>
      <p>
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
