import { Component, DestroyRef, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { humanize } from '../../shared/format';
import { HomeVM, NamedRef } from '../../shared/models';
import { PokemonCard } from '../../shared/pokemon-card';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

@Component({
  selector: 'app-home',
  imports: [RouterLink, PokemonCard],
  templateUrl: './home.html',
})
export default class Home {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly vm = input.required<HomeVM>();

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly q = computed(() => this.query().get('q') ?? '');
  protected readonly type = computed(() => this.query().get('type') ?? '');
  protected readonly generation = computed(() => this.query().get('generation') ?? '');

  /** The last search text this component put in the URL. */
  private pushedQ: string | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** The search box text: follows the URL, except while the user's own typing is pending. */
  protected readonly searchText = linkedSignal<string, string>({
    source: this.q,
    computation: (q, previous) => (previous && q === this.pushedQ ? previous.value : q),
  });

  private readonly typeLabels = computed(
    () => new Map(this.vm().types.map((t) => [t.name, t.label] as const)),
  );

  private readonly matches = computed(() => {
    const needle = this.q().trim().toLowerCase();
    const type = this.type();
    const generation = this.generation();
    return this.vm().pokemon.filter(
      (p) =>
        (!type || p.types.includes(type)) &&
        (!generation || p.generation === generation) &&
        (!needle || humanize(p.name).toLowerCase().includes(needle)),
    );
  });

  protected readonly count = computed(() => this.matches().length);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.count() / PAGE_SIZE)));
  protected readonly page = computed(() => {
    const requested = Number.parseInt(this.query().get('page') ?? '1', 10);
    return Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), this.pageCount());
  });
  protected readonly results = computed(() =>
    this.matches()
      .slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE)
      .map((p) => ({ ...p, typeRefs: p.types.map((t) => this.typeRef(t)) })),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected pageParams(page: number): Params {
    return { page: page > 1 ? page : null };
  }

  protected onSearch(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pushedQ = value;
      this.updateFilters({ q: value }, true);
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onFilter(name: 'type' | 'generation', value: string): void {
    this.updateFilters({ [name]: value }, false);
  }

  private updateFilters(changes: Params, replaceUrl: boolean): void {
    const queryParams: Params = { page: null };
    for (const [key, value] of Object.entries(changes)) queryParams[key] = value || null;
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl });
  }

  private typeRef(name: string): NamedRef {
    return { name, label: this.typeLabels().get(name) ?? humanize(name) };
  }
}
