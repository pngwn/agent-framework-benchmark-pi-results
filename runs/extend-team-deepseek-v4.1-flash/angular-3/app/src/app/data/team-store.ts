import { PLATFORM_ID, REQUEST, Service, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'pokedex.team';
const COOKIE_NAME = 'pokedex_team';
export const TEAM_SIZE = 6;

function normalize(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  return [...new Set(names.filter((name): name is string => typeof name === 'string'))].slice(0, TEAM_SIZE);
}

function parseCookieHeader(header: string | null): string[] {
  if (!header) return [];
  for (const entry of header.split(';')) {
    const [name, ...value] = entry.trim().split('=');
    if (name !== COOKIE_NAME) continue;
    try {
      return normalize(JSON.parse(decodeURIComponent(value.join('='))));
    } catch {
      return [];
    }
  }
  return [];
}

function readCookie(): string[] {
  return parseCookieHeader(typeof document === 'undefined' ? null : document.cookie);
}

/** The user's team: at most six species API names, in the order they were added. */
@Service()
export class TeamStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });
  private readonly members = signal<string[]>(this.readInitial());

  readonly names = this.members.asReadonly();
  readonly size = computed(() => this.members().length);
  readonly full = computed(() => this.size() >= TEAM_SIZE);

  constructor() {
    // Keep the cookie the server reads in sync with a team saved before it existed.
    if (this.isBrowser && this.members().length) this.writeCookie(this.members());
  }

  has(name: string): boolean {
    return this.members().includes(name);
  }

  add(name: string): void {
    if (this.has(name) || this.full()) return;
    this.update([...this.members(), name]);
  }

  remove(name: string): void {
    if (!this.has(name)) return;
    this.update(this.members().filter((member) => member !== name));
  }

  toggle(name: string): void {
    if (this.has(name)) this.remove(name);
    else this.add(name);
  }

  private readInitial(): string[] {
    if (!this.isBrowser) return parseCookieHeader(this.request?.headers.get('cookie') ?? null);
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
    } catch {
      return readCookie();
    }
  }

  private update(names: string[]): void {
    this.members.set(names);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
    } catch {
      // Storage can be unavailable (for example in private browsing); keep the in-memory team.
    }
    this.writeCookie(names);
  }

  private writeCookie(names: string[]): void {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(names))}; path=/; max-age=31536000; SameSite=Lax`;
  }
}
