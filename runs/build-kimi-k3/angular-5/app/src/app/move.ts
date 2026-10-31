import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import {
  ApiError,
  ApiService,
  MISSING,
  englishName,
  humanize,
  latestEnglishFlavorText,
} from './api';
import { CatalogService, TypeCatalogService } from './catalog';
import { PokemonCard, PokemonCards } from './pokemon-cards';
import { NotFound } from './not-found';

interface MoveRecord {
  name: string;
  names: { name: string; language: { name: string } }[];
  type: { name: string } | null;
  damage_class: { name: string } | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: { short_effect: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  learned_by_pokemon: { name: string; url: string }[];
}

@Component({
  selector: 'app-move',
  imports: [RouterLink, PokemonCards, NotFound],
  template: `
    @if (notFound()) {
      <app-not-found />
    } @else if (move(); as move) {
      <h1>{{ enName() }}</h1>
      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd>
            @if (move.type) {
              <a [routerLink]="['/types', move.type.name]">{{ typeEn() }}</a>
            } @else {
              {{ MISSING }}
            }
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ category() }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ move.power ?? MISSING }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ move.accuracy ?? MISSING }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ move.pp ?? MISSING }}</dd>
        </div>
      </dl>

      <section class="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ effect() }}</p>
      </section>

      <section class="section" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{{ cards().length }} Pokémon</p>
        <app-pokemon-cards [cards]="cards()" />
      </section>
    } @else {
      <p aria-hidden="true">Loading…</p>
    }
  `,
})
export class Move {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly typeCatalog = inject(TypeCatalogService);
  private readonly title = inject(Title);

  protected readonly MISSING = MISSING;

  protected readonly notFound = signal(false);
  protected readonly move = signal<MoveRecord | null>(null);
  protected readonly cards = signal<PokemonCard[]>([]);
  protected readonly typeEn = signal('');

  protected readonly enName = computed(() => {
    const m = this.move();
    return m ? englishName(m.names, m.name) : '';
  });

  protected readonly category = computed(() => {
    const name = this.move()?.damage_class?.name;
    return name ? humanize(name) : MISSING;
  });

  protected readonly effect = computed(() => {
    const m = this.move();
    if (!m) return '';
    const short = m.effect_entries.find((e) => e.language?.name === 'en')?.short_effect;
    return short ?? latestEnglishFlavorText(m.flavor_text_entries) ?? MISSING;
  });

  private token = 0;

  constructor() {
    this.route.paramMap.subscribe((params) => void this.load(params.get('name') ?? ''));
  }

  private async load(name: string): Promise<void> {
    const my = ++this.token;
    this.notFound.set(false);
    this.move.set(null);
    this.cards.set([]);

    let move: MoveRecord;
    try {
      move = await this.api.get<MoveRecord>(`move/${name}`);
    } catch (err) {
      if (my !== this.token) return;
      if (err instanceof ApiError && err.status === 404) {
        this.notFound.set(true);
        this.title.setTitle('Not found – Pokédex');
      }
      return;
    }

    const [species, typeByName] = await Promise.all([
      this.catalog.toSpeciesList(move.learned_by_pokemon.map((p) => p.url)),
      this.typeCatalog.byName(),
    ]);
    if (my !== this.token) return;

    this.move.set(move);
    this.title.setTitle(`${englishName(move.names, move.name)} – Pokédex`);
    this.typeEn.set(
      move.type ? (typeByName.get(move.type.name)?.enName ?? humanize(move.type.name)) : '',
    );
    this.cards.set(species.map((s) => ({ id: s.id, name: s.name })));
  }
}
