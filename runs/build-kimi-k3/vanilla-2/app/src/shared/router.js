// Maps a URL path to a page descriptor.
export function matchRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home' };
  if (path === '/types') return { name: 'types' };
  const match = /^\/(pokemon|moves|abilities|types)\/([^/]+)$/.exec(path);
  if (match) return { name: match[1], param: decodeURIComponent(match[2]).toLowerCase() };
  return { name: 'not-found' };
}
