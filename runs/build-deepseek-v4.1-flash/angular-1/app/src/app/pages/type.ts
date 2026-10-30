import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokeApi, SpeciesEntry, TypeRecord } from '../core/pokeapi';
import {
  compareText,
  englishName,
  humanize,
  idFromUrl,
  isAlternateForm,
} from '../core/util';
import { NotFoundContent } from '../shared/not-found-content';
import { PokemonCardVM, PokemonGrid } from '../shared/pokemon-grid';

interface RelationVM {
  term: string;
  types: { name: string; label: string }[];
}

interface MoveLinkVM {
  name: string;
  label: string;
}

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, NotFoundContent, PokemonGrid],
  template: `
    @if (notFound()) {
      <app-not-found-content />
    } @else if (type(); as data) {
      <main class="page">
        <h1>{{ data.name }}</h1>

        <section class="panel" aria-labelledby="relations-heading">
          <h2 id="relations-heading">Damage relations</h2>
          <dl class="damage-relations">
            @for (relation of data.relations; track relation.term) {
              <div>
                <dt>{{ relation.term }}</dt>
                <dd>
                  @if (relation.types.length === 0) {
                    None
                  } @else {
                    @for (type of relation.types; track type.name) {
                      <a
                        class="type-badge type-link"
                        [attr.data-type]="type.name"
                        [routerLink]="['/types', type.name]"
                        >{{ type.label }}</a
                      >
                    }
                  }
                </dd>
              </div>
            }
          </dl>
        </section>

        <section class="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          @if (pokemon(); as pokemon) {
            <p class="result-count">{{ pokemon.count }} Pokémon</p>
            <ul class="pokemon-grid" app-pokemon-grid [cards]="pokemon.cards"></ul>
          }
        </section>

        <section class="panel" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>
          @if (moves(); as moves) {
            <p class="result-count">{{ moves.length }} moves</p>
            <ul class="move-links">
              @for (move of moves; track move.name) {
                <li><a [routerLink]="['/moves', move.name]">{{ move.label }}</a></li>
              }
            </ul>
          }
        </section>
      </main>
    } @else {
      <main class="page"><p class="loading">Loading…</p></main>
    }
  `,
})
export class TypePage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly notFound = signal(false);
  protected readonly type = signal<{ name: string; relations: RelationVM[] } | null>(null);
  protected readonly pokemon = signal<{ count: number; cards: PokemonCardVM[] } | null>(null);
  protected readonly moves = signal<MoveLinkVM[] | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (name) void this.load(name);
    });
  }

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.type.set(null);
    this.pokemon.set(null);
    this.moves.set(null);

    try {
      const [record, speciesIndex] = await Promise.all([
        this.api.getType(name),
        this.api.getSpeciesIndex(),
      ]);
      const displayName = englishName(record.names, record.name);

      this.type.set({
        name: displayName,
        relations: this.buildRelations(record),
      });
      this.pokemon.set(this.buildPokemon(record, speciesIndex));
      this.moves.set(
        record.moves
          .map((move) => ({ name: move.name, label: humanize(move.name) }))
          .sort((a, b) => compareText(a.label, b.label)),
      );
      this.title.setTitle(`${displayName} – Pokédex`);
    } catch {
      this.notFound.set(true);
      this.title.setTitle('Not found – Pokédex');
    }
  }

  private buildRelations(type: TypeRecord): RelationVM[] {
    const relation = (key: string) =>
      (type.damage_relations[key] ?? []).map((entry) => ({
        name: entry.name,
        label: humanize(entry.name),
      }));

    return [
      { term: 'Super effective against', types: relation('double_damage_to') },
      { term: 'Not very effective against', types: relation('half_damage_to') },
      { term: 'No effect against', types: relation('no_damage_to') },
      { term: 'Weak to', types: relation('double_damage_from') },
      { term: 'Resists', types: relation('half_damage_from') },
      { term: 'Immune to', types: relation('no_damage_from') },
    ];
  }

  private buildPokemon(
    type: TypeRecord,
    speciesIndex: SpeciesEntry[],
  ): { count: number; cards: PokemonCardVM[] } {
    const byId = new Map(speciesIndex.map((entry) => [entry.id, entry]));
    const ids = new Set<number>();
    for (const entry of type.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
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
}
