// The not-found page: unknown routes and resources the API doesn't have.

export function renderNotFound(main) {
  document.title = 'Not found – Pokédex';
  main.innerHTML = `
    <h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>`;
}
