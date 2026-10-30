import { DOCUMENT, PLATFORM_ID, REQUEST, Service, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { MAX_TEAM_SIZE, normalizeTeam } from '../shared/team';

const COOKIE_NAME = 'team';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Reads one cookie value from a `Cookie` header or `document.cookie` string. */
function cookieValue(cookies: string, name: string): string | null {
  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The team lives in the browser, in a cookie so the server can render the same state on
 * the first request (and after a reload) as the browser has after hydration.
 */
@Service()
export class TeamStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });

  private readonly namesState = signal(this.readCookie());

  readonly names = this.namesState.asReadonly();
  readonly count = computed(() => this.names().length);
  readonly isFull = computed(() => this.count() >= MAX_TEAM_SIZE);

  has(name: string): boolean {
    return this.namesState().includes(name);
  }

  add(name: string): void {
    if (this.has(name) || this.isFull()) return;
    this.commit([...this.namesState(), name]);
  }

  remove(name: string): void {
    if (!this.has(name)) return;
    this.commit(this.namesState().filter((member) => member !== name));
  }

  toggle(name: string): void {
    if (this.has(name)) this.remove(name);
    else this.add(name);
  }

  private readCookie(): string[] {
    let cookies = '';
    if (isPlatformServer(this.platformId)) {
      cookies = this.request?.headers.get('cookie') ?? '';
    } else if (isPlatformBrowser(this.platformId)) {
      cookies = this.document.cookie;
    }
    return normalizeTeam((cookieValue(cookies, COOKIE_NAME) ?? '').split(','));
  }

  private commit(names: string[]): void {
    const next = normalizeTeam(names);
    this.namesState.set(next);
    if (isPlatformBrowser(this.platformId)) {
      this.document.cookie = `${COOKIE_NAME}=${encodeURIComponent(next.join(','))}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  }
}
