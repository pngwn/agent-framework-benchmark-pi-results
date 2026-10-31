import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PokemonCardsComponent } from './cards.component';
import { Catalog } from './catalog.service';

const PAGE_SIZE = 48;

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonCardsComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly data = input.required<Catalog>();
  // Filter state lives in the URL query (bound by withComponentInputBinding).
  protected readonly q = input<string | undefined>(undefined);
  protected readonly type = input<string | undefined>(undefined);
  protected readonly generation = input<string | undefined>(undefined);
  protected readonly page = input<string | undefined>(undefined);

  private readonly router = inject(Router);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  // Controls stay inert until hydration is done; interactions (including
  // Playwright's) wait for them to become editable.
  protected readonly ready = signal(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected readonly filtered = computed(() => {
    const query = (this.q() ?? '').trim().toLowerCase();
    const type = this.type() ?? '';
    const generation = this.generation() ?? '';
    return this.data().species.filter(
      (s) =>
        (!query || s.humanName.toLowerCase().includes(query)) &&
        (!type || s.types.some((t) => t.name === type)) &&
        (!generation || s.generation === generation),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => {
    const requested = Math.max(1, Number.parseInt(this.page() ?? '', 10) || 1);
    return Math.min(requested, this.totalPages());
  });

  protected readonly pageItems = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(value, this.type() ?? '', this.generation() ?? '', true), 200);
  }

  protected onTypeChange(event: Event): void {
    this.applyFilters(this.q() ?? '', (event.target as HTMLSelectElement).value, this.generation() ?? '');
  }

  protected onGenerationChange(event: Event): void {
    this.applyFilters(this.q() ?? '', this.type() ?? '', (event.target as HTMLSelectElement).value);
  }

  /** Changing a filter updates the URL and goes back to page 1. */
  private applyFilters(q: string, type: string, generation: string, replaceUrl = false): void {
    void this.router.navigate(['/'], {
      queryParams: {
        q: q.trim() || null,
        type: type || null,
        generation: generation || null,
        page: null,
      },
      replaceUrl,
    });
  }

  protected pageParams(page: number): Record<string, string | number | null> {
    return {
      q: (this.q() ?? '').trim() || null,
      type: this.type() || null,
      generation: this.generation() || null,
      page: page > 1 ? page : null,
    };
  }
}
