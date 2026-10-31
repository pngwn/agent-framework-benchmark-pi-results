export function renderNotFound(root: HTMLElement): void {
  document.title = 'Not found – Pokédex';
  root.innerHTML = `
    <h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>`;
}
