import { fetchFragment, isAbort } from './fragments.js';

const SEARCH_DEBOUNCE_MS = 150;

/** Live filtering for the Pokémon list: keeps the URL and the results in sync. */
class PokemonBrowser extends HTMLElement {
	#timer: ReturnType<typeof setTimeout> | undefined;

	connectedCallback() {
		const form = this.querySelector('form');
		if (!form) return;

		form.addEventListener('input', (event) => {
			if (!(event.target instanceof HTMLInputElement)) return;
			clearTimeout(this.#timer);
			this.#timer = setTimeout(() => this.#update(form, 'replace'), SEARCH_DEBOUNCE_MS);
		});
		form.addEventListener('change', (event) => {
			if (event.target instanceof HTMLSelectElement) this.#update(form, 'push');
		});
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			clearTimeout(this.#timer);
			this.#update(form, 'replace');
		});
		window.addEventListener('popstate', () => this.#syncFromLocation(form));
	}

	#update(form: HTMLFormElement, mode: 'push' | 'replace') {
		const query = new URLSearchParams();
		for (const [key, value] of new FormData(form)) {
			const text = String(value).trim();
			if (text) query.set(key, text);
		}
		const search = query.toString();
		const url = search ? `/?${search}` : '/';
		if (url !== location.pathname + location.search) {
			history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
		}
		return this.#load(url);
	}

	#syncFromLocation(form: HTMLFormElement) {
		const params = new URLSearchParams(location.search);
		for (const element of form.elements) {
			if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement)
				element.value = params.get(element.name) ?? '';
		}
		return this.#load(location.pathname + location.search);
	}

	async #load(url: string) {
		try {
			const fresh = await fetchFragment(url, '#results');
			const current = this.querySelector('#results');
			if (fresh && current) current.replaceWith(document.importNode(fresh, true));
		} catch (error) {
			if (!isAbort(error)) location.assign(url);
		}
	}
}

customElements.define('pokemon-browser', PokemonBrowser);
