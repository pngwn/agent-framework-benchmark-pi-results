import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MoveRecord, PokeApi, SpeciesEntry } from '../core/pokeapi';
import {
  dexNumber,
  englishName,
  humanize,
  idFromUrl,
  isAlternateForm,
  latestFlavorText,
  numberOrDash,
} from '../core/util';
import { NotFoundContent } from '../shared/not-found-content';
import { PokemonCardVM, PokemonGrid } from '../shared/pokemon-grid';

interface LearnedByVM {
  count: number;
  cards: PokemonCardVM[];
}

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, NotFoundContent, PokemonGrid],
  template: `
    @if (notFound()) {
      <app-not-found-content />
    } @else if (move(); as data) {
      <main class="page">
        <h1>{{ data.name }}</h1>

        <dl class="move-facts">
          <div>
            <dt>Type</dt>
            <dd>
              <a
                class="type-badge type-link"
                [attr.data-type]="data.typeName"
                [routerLink]="['/types', data.typeName]"
                >{{ data.typeLabel }}</a
              >
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{{ data.category }}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{{ dash(data.power) }}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{{ dash(data.accuracy) }}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{{ dash(data.pp) }}</dd>
          </div>
        </dl>

        <section class="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>{{ data.effect }}</p>
        </section>

        <section class="panel" aria-labelledby="learned-by-heading">
          <h2 id="learned-by-heading">Learned by</h2>
          @if (learnedBy(); as learned) {
            <p class="result-count">{{ learned.count }} Pokémon</p>
            <ul class="pokemon-grid" app-pokemon-grid [cards]="learned.cards"></ul>
          }
        </section>
      </main>
    } @else {
      <main class="page"><p class="loading">Loading…</p></main>
    }
  `,
})
export class MovePage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly humanize = humanize;
  protected readonly dash = numberOrDash;
  protected readonly notFound = signal(false);
  protected readonly move = signal<
    | {
        name: string;
        typeName: string;
        typeLabel: string;
        category: string;
        power: number | null;
        accuracy: number | null;
        pp: number | null;
        effect: string;
      }
    | null
  >(null);
  protected readonly learnedBy = signal<LearnedByVM | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (name) void this.load(name);
    });
  }

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.move.set(null);
    this.learnedBy.set(null);

    try {
      const [record, speciesIndex] = await Promise.all([
        this.api.getMove(name),
        this.api.getSpeciesIndex(),
      ]);
      const displayName = englishName(record.names, record.name);
      const englishEffect = record.effect_entries.find(
        (entry) => entry.language.name === 'en',
      )?.short_effect;
      const effect =
        englishEffect ?? latestFlavorText(record.flavor_text_entries) ?? '—';

      this.move.set({
        name: displayName,
        typeName: record.type.name,
        typeLabel: humanize(record.type.name),
        category: humanize(record.damage_class.name),
        power: record.power,
        accuracy: record.accuracy,
        pp: record.pp,
        effect,
      });

      this.learnedBy.set(this.buildLearnedBy(record, speciesIndex));
      this.title.setTitle(`${displayName} – Pokédex`);
    } catch {
      this.notFound.set(true);
      this.title.setTitle('Not found – Pokédex');
    }
  }

  private buildLearnedBy(
    move: MoveRecord,
    speciesIndex: SpeciesEntry[],
  ): LearnedByVM {
    const byId = new Map(speciesIndex.map((entry) => [entry.id, entry]));
    const ids = new Set<number>();
    for (const entry of move.learned_by_pokemon) {
      const id = idFromUrl(entry.url);
      if (id !== null && !isAlternateForm(id) && byId.has(id)) ids.add(id);
    }

    const cards = [...ids]
      .sort((a, b) => a - b)
      .map((id): PokemonCardVM => {
        const species = byId.get(id)!;
        return {
          id,
          name: species.name,
          displayName: humanize(species.name),
          sprite: this.api.spriteUrl(id),
        };
      });

    return { count: cards.length, cards };
  }

  protected dex(id: number): string {
    return dexNumber(id);
  }
}
