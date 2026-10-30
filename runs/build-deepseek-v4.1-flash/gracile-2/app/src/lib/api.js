const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map();

export class ApiError extends Error {
  constructor(status, url) {
    super(`API request failed (${status}): ${url}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;

  let clean = path.startsWith('/') ? path : `/${path}`;
  if (!clean.startsWith('/api/v2/')) clean = `/api/v2${clean}`;

  const queryIndex = clean.indexOf('?');
  const pathname = queryIndex === -1 ? clean : clean.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : clean.slice(queryIndex);
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;

  return `${API_BASE}${withSlash}${query}`;
}

export function getApiBase() {
  return API_BASE;
}

export function getJson(path) {
  const url = apiUrl(path);
  if (cache.has(url)) return cache.get(url);

  const request = fetch(url, { headers: { accept: 'application/json' } }).then(async (response) => {
    if (!response.ok) throw new ApiError(response.status, url);
    return response.json();
  });

  cache.set(url, request);
  request.catch(() => cache.delete(url));
  return request;
}

export function getList(resource) {
  return getJson(`/${resource}/?limit=100000`);
}

export function getRecord(resource, key) {
  return getJson(`/${resource}/${encodeURIComponent(String(key))}/`);
}

export function getRecordByUrl(url) {
  if (/^https?:\/\//i.test(url)) return getJson(url);
  return getJson(url);
}

export function idFromUrl(url) {
  const pathname = /^https?:\/\//i.test(url) ? new URL(url).pathname : url;
  const match = pathname.match(/\/(\d+)\/?(?:[?#].*)?$/);
  return match ? Number(match[1]) : Number.NaN;
}

export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(record, fallback) {
  const entry = record?.names?.find((item) => item.language?.name === 'en');
  return entry?.name ?? humanize(record?.name ?? fallback);
}

export function englishGenus(record) {
  return record?.genera?.find((item) => item.language?.name === 'en')?.genus ?? '';
}

export function englishEffect(record) {
  return record?.effect_entries?.find((item) => item.language?.name === 'en')?.short_effect ?? '';
}

export function latestEnglishFlavorText(record) {
  const entries = record?.flavor_text_entries ?? [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.language?.name !== 'en') continue;
    const text = entry.flavor_text ?? entry.text ?? '';
    return String(text).replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function typeClassName(name) {
  return `type-${name}`;
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const MAX_REGULAR_ID = 10_000;

export async function getSpeciesIndex() {
  const list = await getList('pokemon-species');

  const items = list.results
    .map((entry) => ({
      id: idFromUrl(entry.url),
      name: entry.name,
      humanizedName: humanize(entry.name),
    }))
    .filter((entry) => Number.isFinite(entry.id) && entry.id < MAX_REGULAR_ID)
    .sort((a, b) => a.id - b.id);

  const byId = new Map(items.map((entry) => [entry.id, entry]));
  const byName = new Map(items.map((entry) => [entry.name, entry]));

  return { items, byId, byName };
}

export function getSpecies(name) {
  return getRecord('pokemon-species', name);
}

export function getPokemon(name) {
  return getRecord('pokemon', name);
}

export function getMove(name) {
  return getRecord('move', name);
}

export function getAbility(name) {
  return getRecord('ability', name);
}

export function getVersionGroup(name) {
  return getRecord('version-group', name);
}

export function getEvolutionChainByUrl(url) {
  return getRecordByUrl(url);
}

export async function getTypeInfo(name) {
  const data = await getRecord('type', name);
  return { name: data.name, data, englishName: englishName(data, name) };
}

export async function getTypeCollection() {
  const list = await getList('type');
  const wanted = list.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name));

  const types = await Promise.all(wanted.map((entry) => getTypeInfo(entry.name)));
  return types.sort((a, b) => a.data.id - b.data.id);
}

export async function getGenerationCollection() {
  const list = await getList('generation');
  const generations = await Promise.all(
    list.results.map(async (entry) => {
      const data = await getRecord('generation', entry.name);
      return {
        name: data.name,
        id: data.id,
        data,
        englishName: englishName(data, data.name),
      };
    }),
  );

  return generations.sort((a, b) => a.id - b.id);
}

export async function getPokemonTypeMap() {
  const types = await getTypeCollection();
  const map = new Map();

  for (const type of types) {
    for (const entry of type.data.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon?.url ?? '');
      if (!Number.isFinite(id) || id >= MAX_REGULAR_ID) continue;

      const values = map.get(id) ?? [];
      if (!values.some((value) => value.name === type.name)) {
        values.push({ name: type.name, englishName: type.englishName, slot: entry.slot ?? 0 });
      }
      map.set(id, values);
    }
  }

  for (const values of map.values()) {
    values.sort((a, b) => a.slot - b.slot || a.name.localeCompare(b.name));
  }

  return map;
}

export async function getGenerationForSpecies() {
  const generations = await getGenerationCollection();
  const map = new Map();

  for (const generation of generations) {
    for (const species of generation.data.pokemon_species ?? []) {
      const id = idFromUrl(species.url);
      if (!Number.isFinite(id) || id >= MAX_REGULAR_ID) continue;
      map.set(id, generation.name);
    }
  }

  return map;
}

export function sortSpeciesById(items) {
  return [...items].sort((a, b) => a.id - b.id);
}

export function uniqueSpeciesFromPokemonReferences(entries, speciesIndex) {
  const seen = new Set();
  const result = [];

  for (const entry of entries ?? []) {
    const id = idFromUrl(entry.pokemon?.url ?? entry.url ?? '');
    if (!Number.isFinite(id) || id >= MAX_REGULAR_ID) continue;
    if (seen.has(id)) continue;

    const species = speciesIndex.byId.get(id);
    if (!species) continue;

    seen.add(id);
    result.push(species);
  }

  return result.sort((a, b) => a.id - b.id);
}

export function spriteUrl(id) {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}
