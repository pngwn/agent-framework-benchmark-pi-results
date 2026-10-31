import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiError, ApiService, englishName, humanize } from './api';
import { CatalogService, TypeCatalogService } from './catalog';
import { PokemonCard, PokemonCards } from './pokemon-cards';
import { NotFound } from './not-found';

interface TypeRecord {
  name: string;
  names: { name: string; language: { name: string } }[];
  damage_relations: Record<string, { name: string }[]>;
  pokemon: { slot: number; pokemon: { name: string; url: string } }[];
  moves: { name: string }[];
}

const RELATIONS: { term: string; key: string }[] = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

interface RelationView {
  term: string;
  types: { name: string; enName: string }[];
}

interface MoveLink {
  name: string;
  label: string;
}

@Component({
  selector: 'app-type',
  imports: [RouterLink, PokemonCards, NotFound],
  template: `
    @if (notFound()) {
      <app-not-found />
    } @else if (type(); as type) {
      <h1>{{ enName() }}</h1>

      <section class="section" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (relation of relations(); track relation.term) {
            <div class="relation">
              <dt>{{ relation.term }}</dt>
              <dd>
                @if (relation.types.length) {
                  @for (t of relation.types; track t.name) {
                    <a class="badge type-{{ t.name }}" [routerLink]="['/types', t.name]">{{ t.enName }}</a>
                  }
                } @else {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>

      <section class="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ cards().length }} Pokémon</p>
        <app-pokemon-cards [cards]="cards()" />
      </section>

      <section class="section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ moves().length }} moves</p>
        <ul class="move-list">
          @for (move of moves(); track move.name) {
            <li>
              <a [routerLink]="['/moves', move.name]">{{ move.label }}</a>
            </li>
          }
        </ul>
      </section>
    } @else {
      <p aria-hidden="true">Loading…</p>
    }
  `,
  styles: `
    .relations {
      margin: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4) var(--space-6);
    }

    .relations dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .relations dd {
      margin: var(--space-1) 0 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .move-list {
      margin: 0;
      padding-left: var(--space-5);
      columns: 4;
    }

    @media (max-width: 40rem) {
      .relations {
        grid-template-columns: 1fr;
      }

      .move-list {
        columns: 2;
      }
    }
  `,
})
export class Type {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly typeCatalog = inject(TypeCatalogService);
  private readonly title = inject(Title);

  protected readonly notFound = signal(false);
  protected readonly type = signal<TypeRecord | null>(null);
  protected readonly relations = signal<RelationView[]>([]);
  protected readonly cards = signal<PokemonCard[]>([]);
  protected readonly moves = signal<MoveLink[]>([]);

  protected readonly enName = computed(() => {
    const t = this.type();
    return t ? englishName(t.names, t.name) : '';
  });

  private token = 0;

  constructor() {
    this.route.paramMap.subscribe((params) => void this.load(params.get('name') ?? ''));
  }

  private async load(name: string): Promise<void> {
    const my = ++this.token;
    this.notFound.set(false);
    this.type.set(null);
    this.relations.set([]);
    this.cards.set([]);
    this.moves.set([]);

    let type: TypeRecord;
    try {
      type = await this.api.get<TypeRecord>(`type/${name}`);
    } catch (err) {
      if (my !== this.token) return;
      if (err instanceof ApiError && err.status === 404) {
        this.notFound.set(true);
        this.title.setTitle('Not found – Pokédex');
      }
      return;
    }

    const [typeByName, species] = await Promise.all([
      this.typeCatalog.byName(),
      this.catalog.toSpeciesList(type.pokemon.map((p) => p.pokemon.url)),
    ]);
    if (my !== this.token) return;

    this.type.set(type);
    this.title.setTitle(`${englishName(type.names, type.name)} – Pokédex`);
    this.relations.set(
      RELATIONS.map(({ term, key }) => ({
        term,
        types: (type.damage_relations[key] ?? []).map((t) => ({
          name: t.name,
          enName: typeByName.get(t.name)?.enName ?? humanize(t.name),
        })),
      })),
    );
    this.cards.set(species.map((s) => ({ id: s.id, name: s.name })));
    this.moves.set(
      type.moves
        .map((m) => ({ name: m.name, label: humanize(m.name) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    );
  }
}
