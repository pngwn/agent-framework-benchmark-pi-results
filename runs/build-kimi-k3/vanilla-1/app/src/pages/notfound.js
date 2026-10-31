export function notFoundPage() {
  const body = `
<h1>Not found</h1>
<p><a href="/">Back to the Pokédex</a></p>`;
  return { title: 'Not found – Pokédex', h1: 'Not found', body, status: 404 };
}
