import {
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import {
  EvolutionChain,
  MoveRecord,
  PokedexData,
  PokemonRecord,
  PokemonSpecies,
  VersionGroupRecord,
} from '../core/pokedex-data';
import { PokeApi } from '../core/poke-api';
import {
  dexNumber,
  englishName,
  formatDecimal,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '../core/helpers';
import { MoveRow, MoveTable } from '../shared/move-table';
import { NotFound } from '../shared/not-found';

interface PokemonPageBase {
  species: PokemonSpecies;
  pokemon: PokemonRecord;
  evolution: EvolutionChain | null;
  versionGroups: VersionGroupRecord[];
  label: string;
  genus: string;
  flavor: string;
  artworkUrl: string;
}

interface MoveTablesData {
  tables: { methodName: string; rows: MoveRow[] }[];
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

@Component({
  selector: 'app-pokemon-page',
  imports: [MoveTable, NotFound, NgTemplateOutlet, RouterLink],
  template: `
    @if (base.hasValue()) {
      @let view = base.value();
      <div class="pokemon-summary">
        <img
          class="artwork"
          [src]="view.artworkUrl"
          [alt]="view.label"
          width="288"
          height="288"
        />
        <div class="summary-body">
          <p class="dex-number">{{ dexNumber(view.species.id) }}</p>
          <h1 class="page-title">{{ view.label }}</h1>
          <p class="genus">{{ view.genus }}</p>

          <div class="type-badges">
            @for (type of view.pokemon.types; track type.type.name) {
              <a
                [routerLink]="['/types', type.type.name]"
                [class]="'type-badge type-' + type.type.name"
              >
                {{ humanize(type.type.name) }}
              </a>
            }
          </div>

          <dl class="pokemon-facts">
            <div>
              <dt>Height</dt>
              <dd>{{ formatDecimal(view.pokemon.height, 'm') }}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{{ formatDecimal(view.pokemon.weight, 'kg') }}</dd>
            </div>
          </dl>

          <p class="flavor">{{ view.flavor }}</p>
        </div>
      </div>

      <section class="section-card" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            @for (stat of view.pokemon.stats; track stat.stat.name) {
              <tr>
                <th scope="row">{{ statLabel(stat.stat.name) }}</th>
                <td>
                  <span class="stat-cell">
                    <span class="stat-number">{{ stat.base_stat }}</span>
                    <span class="stat-track" aria-hidden="true">
                      <span class="stat-bar" [style.width]="statWidth(stat.base_stat)"></span>
                    </span>
                  </span>
                </td>
              </tr>
            }
            <tr>
              <th scope="row">Total</th>
              <td>{{ statTotal(view.pokemon.stats) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section-card" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          @for (entry of view.pokemon.abilities; track entry.ability.name) {
            <li>
              <a [routerLink]="['/abilities', entry.ability.name]">
                {{ humanize(entry.ability.name) }}
              </a>
              @if (entry.is_hidden) {
                <span> (hidden)</span>
              }
            </li>
          }
        </ul>
      </section>

      <section class="section-card" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        @if (view.evolution) {
          <ul class="evolution-list">
            <ng-container
              [ngTemplateOutlet]="evolutionNode"
              [ngTemplateOutletContext]="{ $implicit: view.evolution.chain }"
            />
          </ul>
        }
      </section>

      <section id="moves" class="section-card" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>

        <div class="game-picker">
          <label for="game">Game</label>
          <select id="game" (change)="onGameChange($event)">
            @for (group of gameOptions(); track group.name) {
              <option [value]="group.name" [selected]="group.name === selectedGame()">
                {{ humanize(group.name) }}
              </option>
            }
          </select>
        </div>

        @if (moveTables.hasValue()) {
          @for (table of moveTables.value().tables; track table.methodName) {
            <app-move-table [methodName]="table.methodName" [rows]="table.rows" />
          }
        }
      </section>

      <ng-template #evolutionNode let-node>
        @if (node) {
          <li>
            <a [routerLink]="['/pokemon', node.species.name]">
              {{ humanize(node.species.name) }}
            </a>
            @if (node.evolves_to.length) {
              <ul>
                @for (child of node.evolves_to; track child.species.name) {
                  <ng-container
                    [ngTemplateOutlet]="evolutionNode"
                    [ngTemplateOutletContext]="{ $implicit: child }"
                  />
                }
              </ul>
            }
          </li>
        }
      </ng-template>
    } @else if (base.error()) {
      <app-not-found />
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
})
export class PokemonPage {
  private readonly pokedex = inject(PokedexData);
  private readonly api = inject(PokeApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  readonly name = input.required<string>();
  readonly game = input<string | undefined>();

  protected readonly humanize = humanize;
  protected readonly dexNumber = dexNumber;
  protected readonly formatDecimal = formatDecimal;

  protected readonly base = resource({
    params: () => ({ name: this.name() }),
    loader: async ({ params }): Promise<PokemonPageBase> => {
      const species = await this.pokedex.getSpecies(params.name);
      const defaultVariety =
        species.varieties.find((variety) => variety.is_default) ?? species.varieties[0];
      const defaultPokemonId = defaultVariety ? idFromUrl(defaultVariety.pokemon.url) : species.id;
      const [pokemon, evolution, versionGroups] = await Promise.all([
        this.pokedex.getPokemon(defaultPokemonId),
        species.evolution_chain
          ? this.pokedex.getEvolutionChain(species.evolution_chain.url).catch(() => null)
          : Promise.resolve(null),
        this.pokedex.getAllVersionGroups(),
      ]);
      const genus =
        species.genera.find((entry) => entry.language.name === 'en')?.genus ?? '';
      const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '—';
      const artworkUrl =
        pokemon.sprites.other?.['official-artwork']?.front_default ??
        pokemon.sprites.front_default ??
        this.api.spriteUrl(pokemon.id);
      return {
        species,
        pokemon,
        evolution,
        versionGroups,
        label: englishName(species.names, species.name),
        genus,
        flavor,
        artworkUrl,
      };
    },
  });

  protected readonly gameOptions = computed(() => {
    if (!this.base.hasValue()) return [];
    const view = this.base.value();
    const games = new Set<string>();
    for (const move of view.pokemon.moves) {
      for (const detail of move.version_group_details) {
        games.add(detail.version_group.name);
      }
    }
    return view.versionGroups.filter((group) => games.has(group.name)).sort((a, b) => a.order - b.order);
  });

  protected readonly selectedGame = computed(() => {
    const options = this.gameOptions();
    const requested = this.game() ?? '';
    return (
      options.find((option) => option.name === requested)?.name ??
      options[options.length - 1]?.name ??
      ''
    );
  });

  protected readonly moveTables = resource({
    params: () => {
      if (!this.base.hasValue()) return undefined;
      const game = this.selectedGame();
      return game ? { game } : undefined;
    },
    loader: async ({ params }): Promise<MoveTablesData> => {
      const pokemon = this.base.value()!.pokemon;
      const entries: { moveName: string; methodName: string; level: number }[] = [];
      for (const move of pokemon.moves) {
        for (const detail of move.version_group_details) {
          if (detail.version_group.name !== params.game) continue;
          entries.push({
            moveName: move.move.name,
            methodName: detail.move_learn_method.name,
            level: detail.level_learned_at,
          });
        }
      }

      const moveNames = [...new Set(entries.map((entry) => entry.moveName))];
      const records = await Promise.all(
        moveNames.map((name) => this.pokedex.getMove(name).catch(() => null)),
      );
      const moveByName = new Map<string, MoveRecord | null>();
      moveNames.forEach((name, index) => moveByName.set(name, records[index]));

      const rowsByMethod = new Map<string, MoveRow[]>();
      for (const entry of entries) {
        const move = moveByName.get(entry.moveName);
        if (!move) continue;
        const rows = rowsByMethod.get(entry.methodName) ?? [];
        rows.push({
          level: entry.level,
          moveName: englishName(move.names, move.name),
          moveApiName: move.name,
          typeName: move.type.name,
          typeLabel: humanize(move.type.name),
          category: humanize(move.damage_class.name),
          power: move.power,
          accuracy: move.accuracy,
          pp: move.pp,
        });
        rowsByMethod.set(entry.methodName, rows);
      }

      const methodNames = [...rowsByMethod.keys()].sort((a, b) => {
        const aIndex = METHOD_ORDER.indexOf(a);
        const bIndex = METHOD_ORDER.indexOf(b);
        if (aIndex !== -1 || bIndex !== -1) {
          return (aIndex === -1 ? METHOD_ORDER.length : aIndex) -
            (bIndex === -1 ? METHOD_ORDER.length : bIndex);
        }
        return humanize(a).localeCompare(humanize(b));
      });

      return {
        tables: methodNames.map((methodName) => ({
          methodName,
          rows: rowsByMethod.get(methodName) ?? [],
        })),
      };
    },
  });

  constructor() {
    effect(() => {
      if (this.base.hasValue()) {
        this.title.setTitle(`${this.base.value().label} – Pokédex`);
      }
    });

    effect(() => {
      const ready = this.base.hasValue();
      this.moveTables.hasValue();
      if (!ready) return;
      setTimeout(() => {
        if (window.location.hash === '#moves') {
          document.getElementById('moves')?.scrollIntoView();
        }
      });
    });
  }

  protected onGameChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game: value },
    });
  }

  protected statLabel(name: string): string {
    return STAT_LABELS[name] ?? humanize(name);
  }

  protected statTotal(stats: { base_stat: number }[]): number {
    return stats.reduce((total, stat) => total + stat.base_stat, 0);
  }

  protected statWidth(value: number): string {
    return `${Math.min(100, (value / 255) * 100)}%`;
  }
}
