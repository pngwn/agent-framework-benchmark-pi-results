// Warm the in-memory API cache when the production server starts so the first
// request doesn't pay the full cost of loading every Pokémon record.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  try {
    const { getHomeData, getVersionGroups } = await import('./lib/data.js');
    getHomeData().catch(() => {});
    getVersionGroups().catch(() => {});
  } catch {
    // Warming is best-effort; pages fetch on demand.
  }
}
