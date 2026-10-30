import Link from 'next/link';

export const metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p className="notFoundLink">
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
