import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokeApi, TypeMembership, GenerationInfo, TypeInfo } from '../../core/poke-api';
import { SpeciesListItem } from '../../core/models';
import { humanize } from '../../core/format';
import { PokemonCard } from '../../shared/pokemon-card';

const PAGE_SIZE = 48;

interface HomeData {
  species: SpeciesListItem[];
  types: TypeInfo[];
  generations: GenerationInfo[];
  typeMap: Map<number, TypeMembership[]>;
  generationMap: Map<number, string>;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly data = signal<HomeData | null>(null);
  readonly q = signal('');
  readonly type = signal('');
  readonly generation = signal('');
  readonly page = signal(1);

  constructor() {
    this.title.setTitle('Pokédex');

    this.route.queryParamMap.subscribe((params) => {
      this.q.set(params.get('q') ?? '');
      this.type.set(params.get('type') ?? '');
      this.generation.set(params.get('generation') ?? '');
      const parsed = Number(params.get('page') ?? 1);
      this.page.set(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1);
    });

    Promise.all([
      this.api.allSpecies(),
      this.api.typeInfo(),
      this.api.generationInfo(),
      this.api.speciesTypes(),
      this.api.speciesGenerations(),
    ]).then(([species, types, generations, typeMap, generationMap]) => {
      this.data.set({ species, types, generations, typeMap, generationMap });
    });
  }

  readonly filtered = computed(() => {
    const data = this.data();
    if (!data) return [];
    const q = this.q().trim().toLowerCase();
    const type = this.type();
    const generation = this.generation();

    return data.species.filter((entry) => {
      if (q && !humanize(entry.name).toLowerCase().includes(q)) return false;
      if (type && !(data.typeMap.get(entry.id) ?? []).some((membership) => membership.name === type)) {
        return false;
      }
      if (generation && data.generationMap.get(entry.id) !== generation) return false;
      return true;
    });
  });

  readonly count = computed(() => this.filtered().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageSpecies = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  typesFor(id: number): TypeMembership[] {
    return this.data()?.typeMap.get(id) ?? [];
  }

  onSearch(event: Event): void {
    this.navigate({ q: (event.target as HTMLInputElement).value, page: 1 }, true);
  }

  onTypeChange(event: Event): void {
    this.navigate({ type: (event.target as HTMLSelectElement).value, page: 1 });
  }

  onGenerationChange(event: Event): void {
    this.navigate({ generation: (event.target as HTMLSelectElement).value, page: 1 });
  }

  pageQuery(page: number): Record<string, string | number> {
    const query: Record<string, string | number> = {};
    if (this.q()) query['q'] = this.q();
    if (this.type()) query['type'] = this.type();
    if (this.generation()) query['generation'] = this.generation();
    if (page > 1) query['page'] = page;
    return query;
  }

  private navigate(changes: { q?: string; type?: string; generation?: string; page?: number }, replaceUrl = false): void {
    const q = changes.q ?? this.q();
    const type = changes.type ?? this.type();
    const generation = changes.generation ?? this.generation();
    const page = changes.page ?? this.page();

    const queryParams: Record<string, string | number> = {};
    if (q) queryParams['q'] = q;
    if (type) queryParams['type'] = type;
    if (generation) queryParams['generation'] = generation;
    if (page > 1) queryParams['page'] = page;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl,
    });
  }
}
