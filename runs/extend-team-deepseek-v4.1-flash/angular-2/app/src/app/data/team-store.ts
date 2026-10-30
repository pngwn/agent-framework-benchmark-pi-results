import { Injectable, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** A team holds at most this many species. */
export const TEAM_SIZE = 6;

const STORAGE_KEY = 'pokedex.team';

function readStoredTeam(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const names = parsed.filter((name): name is string => typeof name === 'string' && name.length > 0);
    return [...new Set(names)].slice(0, TEAM_SIZE);
  } catch {
    return [];
  }
}

/**
 * The user's team, persisted in the browser's localStorage. The server renders with an
 * empty team; the stored team is loaded after the first render so hydration stays clean.
 */
@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly namesState = signal<string[]>([]);
  private readonly readyState = signal(false);

  readonly names = this.namesState.asReadonly();
  readonly ready = this.readyState.asReadonly();

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        this.namesState.set(readStoredTeam());
        this.readyState.set(true);
      });
    }
  }

  has(name: string): boolean {
    return this.namesState().includes(name);
  }

  isFull(): boolean {
    return this.namesState().length >= TEAM_SIZE;
  }

  add(name: string): void {
    const names = this.namesState();
    if (!name || names.includes(name) || names.length >= TEAM_SIZE) return;
    this.setNames([...names, name]);
  }

  remove(name: string): void {
    this.setNames(this.namesState().filter((existing) => existing !== name));
  }

  private setNames(names: string[]): void {
    this.namesState.set(names);
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
      } catch {
        // Storage can be unavailable (private mode, quota); the team still works in memory.
      }
    }
  }
}
