import { apiGet } from './api';
import { humanize } from './display';

export { humanize };

const BASE = '/api/v2';

export function idFromUrl(url) {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export async function getSpeciesIndex() {
  const data = await apiGet(`${BASE}/pokemon-species/?limit=100000`);
  if (!data?.results) return [];
  return data.results
    .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url), url: entry.url }))
    .filter((entry) => entry.name && entry.id !== null)
    .sort((a, b) => a.id - b.id);
}

let speciesIndexPromise;
export function getSpeciesIndexCached() {
  speciesIndexPromise ??= getSpeciesIndex();
  return speciesIndexPromise;
}

export async function getSpecies(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/pokemon-species/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getPokemon(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/pokemon/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getMove(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/move/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getAbility(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/ability/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getType(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/type/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getGeneration(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/generation/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getVersionGroup(nameOrId) {
  if (nameOrId === null || nameOrId === undefined) return null;
  return fetch(`${BASE}/version-group/${encodeURIComponent(String(nameOrId))}/`);
}

async function fetch(path) {
  return apiGet(path);
}

export async function getSpeciesByIdMap() {
  const species = await getSpeciesIndexCached();
  return new Map(species.map((entry) => [entry.id, entry]));
}

export async function getTypeDirectory() {
  const data = await apiGet(`${BASE}/type/?limit=1000`);
  const entries = (data?.results ?? [])
    .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url), url: entry.url }))
    .filter((entry) => entry.name && !['stellar', 'unknown', 'shadow'].includes(entry.name));

  const resources = await Promise.all(entries.map((entry) => getType(entry.name)));
  return entries
    .map((entry, index) => {
      const resource = resources[index];
      const english = resource?.names?.find((item) => item?.language?.name === 'en')?.name;
      return { ...entry, resource, label: english || humanize(entry.name) };
    })
    .sort((a, b) => a.id - b.id);
}

let typeDirectoryPromise;
export function getTypeDirectoryCached() {
  typeDirectoryPromise ??= getTypeDirectory();
  return typeDirectoryPromise;
}

export async function getTypeLabelMap() {
  const directory = await getTypeDirectoryCached();
  return new Map(directory.map((entry) => [entry.name, entry.label]));
}

export async function typeLabel(name) {
  const labels = await getTypeLabelMap();
  return labels.get(name) ?? humanize(name);
}

export async function getGenerations() {
  const data = await apiGet(`${BASE}/generation/?limit=1000`);
  const entries = (data?.results ?? [])
    .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url), url: entry.url }))
    .filter((entry) => entry.name);

  const resources = await Promise.all(entries.map((entry) => getGeneration(entry.name)));
  return entries
    .map((entry, index) => {
      const resource = resources[index];
      const english = resource?.names?.find((item) => item?.language?.name === 'en')?.name;
      return { ...entry, resource, label: english || humanize(entry.name) };
    })
    .sort((a, b) => a.id - b.id);
}

export async function speciesFromPokemonRefs(refs) {
  const speciesById = await getSpeciesByIdMap();
  const ids = new Set();
  for (const ref of refs ?? []) {
    const pokemon = ref?.pokemon ?? ref;
    const id = idFromUrl(pokemon?.url);
    if (id !== null && id <= 10000 && speciesById.has(id)) ids.add(id);
  }
  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => speciesById.get(id));
}

export function spriteUrl(id) {
  const base = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
  return `${base}/media/sprites/pokemon/${id}.png`;
}
