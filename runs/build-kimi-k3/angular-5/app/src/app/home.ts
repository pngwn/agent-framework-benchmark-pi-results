import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiService, englishName, humanize, idFromUrl } from './api';
import { CatalogService, SpeciesRef, TypeCatalogService, TypeInfo } from './catalog';
import { PokemonCard, PokemonCards } from './pokemon-cards';

const PAGE_SIZE = 48;

interface GenerationOption {
  name: string;
  enName: string;
}

interface PokemonRecord {
  types: { slot: number; type: { name: string } }[];
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, PokemonCards],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly typeCatalog = inject(TypeCatalogService);

  protected readonly types = signal<TypeInfo[]>([]);
  protected readonly generations = signal<GenerationOption[]>([]);

  protected readonly q = signal('');
  protected readonly type = signal('');
  protected readonly generation = signal('');
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly items = signal<PokemonCard[]>([]);
  protected readonly loaded = signal(false);

  private token = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(Title).setTitle('Pokédex');
    void this.typeCatalog.all().then((types) => this.types.set(types));
    void this.loadGenerations();
    this.route.queryParamMap.subscribe((params) => {
      this.q.set(params.get('q') ?? '');
      this.type.set(params.get('type') ?? '');
      this.generation.set(params.get('generation') ?? '');
      this.page.set(Math.max(1, Number(params.get('page')) || 1));
      void this.load();
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  private async loadGenerations(): Promise<void> {
    const results = await this.api.list('generation');
    const records = await Promise.all(
      results.map((r) => this.api.getByUrl<{ names?: { name: string; language: { name: string } }[] }>(r.url)),
    );
    this.generations.set(results.map((r, i) => ({ name: r.name ?? '', enName: englishName(records[i].names, r.name ?? '') })));
  }

  private async load(): Promise<void> {
    const my = ++this.token;
    try {
      let pool: SpeciesRef[] = await this.catalog.species();

      const type = this.type();
      if (type) {
        try {
          const record = await this.api.get<{ pokemon: { pokemon: { url: string } }[] }>(`type/${type}`);
          const ids = new Set(
            (await this.catalog.toSpeciesList(record.pokemon.map((p) => p.pokemon.url))).map((s) => s.id),
          );
          pool = pool.filter((s) => ids.has(s.id));
        } catch {
          pool = [];
        }
      }

      const generation = this.generation();
      if (generation) {
        try {
          const record = await this.api.get<{ pokemon_species: { url: string }[] }>(`generation/${generation}`);
          const ids = new Set(record.pokemon_species.map((s) => idFromUrl(s.url)));
          pool = pool.filter((s) => ids.has(s.id));
        } catch {
          pool = [];
        }
      }

      const query = this.q().trim().toLowerCase();
      if (query) {
        pool = pool.filter((s) => humanize(s.name).toLowerCase().includes(query));
      }

      const total = pool.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const page = Math.min(this.page(), totalPages);
      const slice = pool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      const [details, typeByName] = await Promise.all([
        Promise.all(slice.map((s) => this.api.get<PokemonRecord>(`pokemon/${s.id}`).catch(() => null))),
        this.typeCatalog.byName(),
      ]);
      if (my !== this.token) return;

      this.items.set(
        slice.map((s, i) => ({
          id: s.id,
          name: s.name,
          types: (details[i]?.types ?? [])
            .slice()
            .sort((a, b) => a.slot - b.slot)
            .map((t) => ({
              name: t.type.name,
              enName: typeByName.get(t.type.name)?.enName ?? humanize(t.type.name),
            })),
        })),
      );
      this.total.set(total);
      this.totalPages.set(totalPages);
      this.page.set(page);
    } finally {
      if (my === this.token) this.loaded.set(true);
    }
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.q.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: value || null, page: null },
        queryParamsHandling: 'merge',
      });
    }, 200);
  }

  protected onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onGenerationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { generation: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected pageQuery(page: number): Record<string, number | null> {
    return { page: page > 1 ? page : null };
  }
}
