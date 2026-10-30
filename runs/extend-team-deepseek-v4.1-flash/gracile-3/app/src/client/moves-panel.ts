import { fetchFragment, isAbort } from './fragments.js';

/** Switches the move tables to another game without a full page load. */
class MovesPanel extends HTMLElement {
	connectedCallback() {
		const form = this.querySelector('form');
		const select = form?.querySelector('select');
		if (!form || !select) return;

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			this.#show(select.value);
		});
		select.addEventListener('change', () => this.#show(select.value));
	}

	async #show(game: string) {
		const url = new URL(location.href);
		url.searchParams.set('game', game);
		history.replaceState(null, '', url);
		try {
			const fresh = await fetchFragment(url.pathname + url.search, '#move-tables');
			const current = this.querySelector('#move-tables');
			if (fresh && current) current.replaceWith(document.importNode(fresh, true));
		} catch (error) {
			if (!isAbort(error)) location.assign(url);
		}
	}
}

customElements.define('moves-panel', MovesPanel);
