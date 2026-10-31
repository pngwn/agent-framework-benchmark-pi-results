// Tiny navigation bus so pages can trigger a client-side route change
// without importing the router itself.
let handler: () => void = () => {};

export const onNavigate = (h: () => void): void => {
  handler = h;
};

export function navigate(url: string, replace = false): void {
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  handler();
}
