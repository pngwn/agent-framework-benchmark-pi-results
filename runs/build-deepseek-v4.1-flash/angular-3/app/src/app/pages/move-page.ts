import { Component, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PokedexData, MoveRecord } from '../core/pokedex-data';
import { PokeApi } from '../core/poke-api';
import {
  englishName,
  englishText,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '../core/helpers';
import { RouterLink } from '@angular/router';
import { PokemonCard } from '../shared/pokemon-card';
import { NotFound } from '../shared/not-found';

interface MovePageData {
  move: MoveRecord;
  label: string;
  typeLabel: string;
  category: string;
  effect: string;
  pokemon: { id: number; name: string; displayName: string }[];
}

@Component({
  selector: 'app-move-page',
  imports: [PokemonCard, NotFound, RouterLink],
  template: `
    @if (data.hasValue()) {
      <h1 class="page-title">{{ data.value().label }}</h1>

      <dl class="detail-grid move-facts">
        <div>
          <dt>Type</dt>
          <dd>
            <a
              [routerLink]="['/types', data.value().move.type.name]"
              [class]="'type-badge type-' + data.value().move.type.name"
            >
              {{ data.value().typeLabel }}
            </a>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ data.value().category }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ display(data.value().move.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ display(data.value().move.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ display(data.value().move.pp) }}</dd>
        </div>
      </dl>

      <section class="section-card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ data.value().effect }}</p>
      </section>

      <section class="section-card" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="results-count">{{ data.value().pokemon.length }} Pokémon</p>
        <ul class="card-grid">
          @for (entry of data.value().pokemon; track entry.id) {
            <li
              app-pokemon-card
              [id]="entry.id"
              [speciesName]="entry.name"
              [displayName]="entry.displayName"
              [spriteUrl]="spriteUrl(entry.id)"
            ></li>
          }
        </ul>
      </section>
    } @else if (data.error()) {
      <app-not-found />
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
})
export class MovePage {
  private readonly pokedex = inject(PokedexData);
  private readonly api = inject(PokeApi);
  private readonly title = inject(Title);

  readonly name = input.required<string>();

  protected readonly display = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : String(value);
  protected readonly spriteUrl = (id: number) => this.api.spriteUrl(id);

  protected readonly data = resource({
    params: () => ({ name: this.name() }),
    loader: async ({ params }): Promise<MovePageData> => {
      const [move, species] = await Promise.all([
        this.pokedex.getMove(params.name),
        this.pokedex.getAllSpecies(),
      ]);
      const speciesById = new Map(species.map((entry) => [entry.id, entry]));
      const seen = new Set<number>();
      const pokemon: { id: number; name: string; displayName: string }[] = [];
      for (const ref of move.learned_by_pokemon) {
        const id = idFromUrl(ref.url);
        if (id > 10_000 || seen.has(id)) continue;
        const entry = speciesById.get(id);
        if (!entry) continue;
        seen.add(id);
        pokemon.push({ id: entry.id, name: entry.name, displayName: humanize(entry.name) });
      }
      pokemon.sort((a, b) => a.id - b.id);

      const englishEffect = englishText(move.effect_entries)?.short_effect;
      const effect =
        englishEffect ??
        latestEnglishFlavor(move.flavor_text_entries) ??
        '—';

      return {
        move,
        label: englishName(move.names, move.name),
        typeLabel: humanize(move.type.name),
        category: humanize(move.damage_class.name),
        effect,
        pokemon,
      };
    },
  });

  constructor() {
    effect(() => {
      if (this.data.hasValue()) {
        this.title.setTitle(`${this.data.value().label} – Pokédex`);
      }
    });
  }
}
