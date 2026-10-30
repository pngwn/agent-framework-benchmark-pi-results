// Fetches a server-rendered page and returns one of its elements, so islands can
// refresh part of the page without duplicating the server templates.

let controller: AbortController | null = null;

export async function fetchFragment(url: string, selector: string) {
	controller?.abort();
	controller = new AbortController();
	const res = await fetch(url, {
		signal: controller.signal,
		headers: { accept: 'text/html' },
	});
	const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
	return doc.querySelector(selector);
}

export const isAbort = (error: unknown) =>
	error instanceof DOMException && error.name === 'AbortError';
