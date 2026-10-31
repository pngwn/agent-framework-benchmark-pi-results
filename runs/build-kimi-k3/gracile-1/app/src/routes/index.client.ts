/**
 * Home page interactivity: filters live in the URL query. Changing any
 * filter navigates to the filtered URL and goes back to page 1. Search
 * updates as the user types (debounced).
 */

function navigate(patch: Record<string, string | null>): void {
	const params = new URLSearchParams(window.location.search);
	for (const [key, value] of Object.entries(patch)) {
		if (value === null || value === '') params.delete(key);
		else params.set(key, value);
	}
	const query = params.toString();
	window.location.assign(window.location.pathname + (query ? `?${query}` : ''));
}

const search = document.querySelector<HTMLInputElement>('#filter-q');
const typeSelect = document.querySelector<HTMLSelectElement>('#filter-type');
const generationSelect = document.querySelector<HTMLSelectElement>('#filter-generation');

let debounce: ReturnType<typeof setTimeout> | undefined;
search?.addEventListener('input', () => {
	clearTimeout(debounce);
	debounce = setTimeout(() => {
		navigate({ q: search.value.trim(), page: null });
	}, 250);
});

typeSelect?.addEventListener('change', () => {
	navigate({ type: typeSelect.value, page: null });
});

generationSelect?.addEventListener('change', () => {
	navigate({ generation: generationSelect.value, page: null });
});
