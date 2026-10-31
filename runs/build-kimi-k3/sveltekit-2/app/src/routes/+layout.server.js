export function load() {
  const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
  return { apiBase };
}
