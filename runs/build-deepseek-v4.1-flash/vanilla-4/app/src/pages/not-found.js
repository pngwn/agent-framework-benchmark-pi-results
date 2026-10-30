import { setDocumentTitle } from '../utils.js';

export function renderNotFoundPage(main) {
  main.innerHTML = `
    <h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>
  `;
  setDocumentTitle('Not found');
}
