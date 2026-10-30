import { LitElement, html } from 'lit';
import { cardGrid } from '../lib/view.js';
import { filterPokedex, homeUrl } from '../lib/filter.js';

class PokemonResults extends LitElement {
  static properties = {
    data: { attribute: false },
    state: { attribute: false },
    result: { attribute: false },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.data = null;
    this.state = { q: '', type: '', generation: '', page: 1 };
    this.result = null;
    this.handleSearch = this.handleSearch.bind(this);
    this.handleType = this.handleType.bind(this);
    this.handleGeneration = this.handleGeneration.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.dataset.dex) return;
    this.data = JSON.parse(decodeURIComponent(this.dataset.dex));
    this.searchInput = document.getElementById('pokedex-search');
    this.typeSelect = document.getElementById('pokedex-type');
    this.generationSelect = document.getElementById('pokedex-generation');

    this.searchInput?.addEventListener('input', this.handleSearch);
    this.typeSelect?.addEventListener('change', this.handleType);
    this.generationSelect?.addEventListener('change', this.handleGeneration);
    window.addEventListener('popstate', this.handlePopState);

    this.readFromUrl();
    this.replaceChildren();
    this.compute();
  }

  disconnectedCallback() {
    this.searchInput?.removeEventListener('input', this.handleSearch);
    this.typeSelect?.removeEventListener('change', this.handleType);
    this.generationSelect?.removeEventListener('change', this.handleGeneration);
    window.removeEventListener('popstate', this.handlePopState);
    super.disconnectedCallback();
  }

  readFromUrl() {
    const params = new URLSearchParams(window.location.search);
    this.state = {
      q: params.get('q') ?? '',
      type: params.get('type') ?? '',
      generation: params.get('generation') ?? '',
      page: Number.parseInt(params.get('page') ?? '1', 10) || 1,
    };
    if (this.searchInput) this.searchInput.value = this.state.q;
    if (this.typeSelect) this.typeSelect.value = this.state.type;
    if (this.generationSelect) this.generationSelect.value = this.state.generation;
  }

  compute() {
    if (!this.data) return;
    this.result = filterPokedex(this.data.items, this.state);
    this.requestUpdate();
  }

  writeUrl(mode = 'replace') {
    const url = homeUrl(this.result ?? this.state);
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  handleSearch(event) {
    this.state = { ...this.state, q: event.target.value, page: 1 };
    this.compute();
    this.writeUrl('replace');
  }

  handleType(event) {
    this.state = { ...this.state, type: event.target.value, page: 1 };
    this.compute();
    this.writeUrl('push');
  }

  handleGeneration(event) {
    this.state = { ...this.state, generation: event.target.value, page: 1 };
    this.compute();
    this.writeUrl('push');
  }

  handlePopState() {
    this.readFromUrl();
    this.compute();
  }

  render() {
    if (!this.result) return html``;
    const result = this.result;
    const pageLink = (page) => homeUrl({ ...this.state, page });
    return html`
      <p class="count-line">${result.total} Pokémon</p>
      ${result.total === 0
        ? html`<p class="empty-message">No Pokémon found</p>`
        : cardGrid(result.items, { showTypes: true })}
      ${result.total > 0
        ? html`
            <p class="pagination">
              ${result.page > 1
                ? html`<a href=${pageLink(result.page - 1)}>Previous page</a>`
                : ''}
              <span>Page ${result.page} of ${result.totalPages}</span>
              ${result.page < result.totalPages
                ? html`<a href=${pageLink(result.page + 1)}>Next page</a>`
                : ''}
            </p>
          `
        : ''}
    `;
  }
}

customElements.define('pokemon-results', PokemonResults);
