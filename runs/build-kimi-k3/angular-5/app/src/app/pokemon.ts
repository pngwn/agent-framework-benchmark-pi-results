import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import {
  API_BASE,
  ApiError,
  ApiService,
  MISSING,
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavorText,
  rebaseUrl,
} from './api';
import { CardType } from './pokemon-cards';
import { TypeCatalogService } from './catalog';
import { NotFound } from './not-found';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface SpeciesRecord {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  evolution_chain: { url: string };
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
}

interface PokemonRecord {
  height: number;
  weight: number;
  stats: { base_stat: number; stat: { name: string } }[];
  types: { slot: number; type: { name: string } }[];
  abilities: { is_hidden: boolean; slot: number; ability: { name: string } }[];
  sprites: { front_default: string | null; other?: { 'official-artwork'?: { front_default: string | null } } };
  moves: {
    move: { name: string };
    version_group_details: {
      level_learned_at: number;
      version_group: { name: string };
      move_learn_method: { name: string };
    }[];
  }[];
}

interface EvolutionNode {
  species: { name: string };
  evolves_to: EvolutionNode[];
}

interface MoveRecord {
  name: string;
  names: { name: string; language: { name: string } }[];
  type: { name: string } | null;
  damage_class: { name: string } | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveRow {
  level: number | null;
  moveName: string;
  moveEn: string;
  typeName: string;
  typeEn: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveTable {
  method: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

interface GameOption {
  name: string;
  label: string;
  order: number;
}

type SortDir = 'ascending' | 'descending';
interface SortState {
  col: string;
  dir: SortDir;
}

function rowValue(row: MoveRow, col: string): string | number | null {
  switch (col) {
    case 'level':
      return row.level;
    case 'move':
      return row.moveEn;
    case 'type':
      return row.typeEn;
    case 'category':
      return row.category;
    case 'power':
      return row.power;
    case 'accuracy':
      return row.accuracy;
    case 'pp':
      return row.pp;
    default:
      return null;
  }
}

function compareRows(a: MoveRow, b: MoveRow, sort: SortState): number {
  const va = rowValue(a, sort.col);
  const vb = rowValue(b, sort.col);
  const tie = a.moveEn.localeCompare(b.moveEn);
  const missingA = va === null || va === undefined;
  const missingB = vb === null || vb === undefined;
  // Missing values sort last in both directions.
  if (missingA && missingB) return tie;
  if (missingA) return 1;
  if (missingB) return -1;
  let result = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
  if (sort.dir === 'descending') result = -result;
  return result !== 0 ? result : tie;
}

@Component({
  selector: 'app-pokemon',
  imports: [RouterLink, NgTemplateOutlet, NotFound],
  templateUrl: './pokemon.html',
  styleUrl: './pokemon.css',
})
export class Pokemon {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly typeCatalog = inject(TypeCatalogService);
  private readonly title = inject(Title);

  protected readonly MISSING = MISSING;
  protected readonly humanize = humanize;
  protected readonly dexNumber = dexNumber;

  protected readonly notFound = signal(false);
  protected readonly species = signal<SpeciesRecord | null>(null);
  protected readonly pokemon = signal<PokemonRecord | null>(null);
  protected readonly typeBadges = signal<CardType[]>([]);
  protected readonly evolution = signal<EvolutionNode | null>(null);
  protected readonly games = signal<GameOption[]>([]);
  protected readonly selectedGame = signal('');
  protected readonly tables = signal<MoveTable[]>([]);
  protected readonly sorts = signal<Record<string, SortState>>({});

  protected readonly enName = computed(() => {
    const s = this.species();
    return s ? englishName(s.names, s.name) : '';
  });

  protected readonly genus = computed(() => {
    const s = this.species();
    return s?.genera.find((g) => g.language?.name === 'en')?.genus ?? '';
  });

  protected readonly flavor = computed(() => latestEnglishFlavorText(this.species()?.flavor_text_entries));

  protected readonly artwork = computed(() => {
    const p = this.pokemon();
    const url = p?.sprites.other?.['official-artwork']?.front_default ?? p?.sprites.front_default;
    return rebaseUrl(url) ?? `${API_BASE}/media/sprites/pokemon/${this.species()?.id}.png`;
  });

  protected readonly height = computed(() => `${((this.pokemon()?.height ?? 0) / 10).toFixed(1)} m`);
  protected readonly weight = computed(() => `${((this.pokemon()?.weight ?? 0) / 10).toFixed(1)} kg`);

  protected readonly stats = computed(() =>
    (this.pokemon()?.stats ?? []).map((s) => ({
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
  );

  protected readonly statTotal = computed(() => this.stats().reduce((sum, s) => sum + s.value, 0));

  protected readonly abilities = computed(() =>
    (this.pokemon()?.abilities ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
  );

  protected readonly displayTables = computed(() => {
    const sorts = this.sorts();
    return this.tables().map((table) => {
      const sort = sorts[table.method];
      if (!sort) return table;
      return { ...table, rows: [...table.rows].sort((a, b) => compareRows(a, b, sort)) };
    });
  });

  private loadToken = 0;
  private tableToken = 0;
  private gameParam: string | null = null;
  private scrollPending = this.route.snapshot.fragment === 'moves';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name') ?? '';
      void this.loadPokemon(name);
    });
    this.route.queryParamMap.subscribe((params) => {
      this.gameParam = params.get('game');
      this.applyGameSelection();
    });
  }

  private async loadPokemon(name: string): Promise<void> {
    const my = ++this.loadToken;
    this.notFound.set(false);
    this.species.set(null);
    this.pokemon.set(null);
    this.typeBadges.set([]);
    this.evolution.set(null);
    this.games.set([]);
    this.selectedGame.set('');
    this.tables.set([]);
    this.sorts.set({});

    let species: SpeciesRecord;
    try {
      species = await this.api.get<SpeciesRecord>(`pokemon-species/${name}`);
    } catch (err) {
      if (my !== this.loadToken) return;
      if (err instanceof ApiError && err.status === 404) this.showNotFound();
      return;
    }

    const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
    try {
      const [pokemon, evolution, typeByName] = await Promise.all([
        this.api.getByUrl<PokemonRecord>(variety.pokemon.url),
        this.api.getByUrl<{ chain: EvolutionNode }>(species.evolution_chain.url),
        this.typeCatalog.byName(),
      ]);
      if (my !== this.loadToken) return;

      this.species.set(species);
      this.pokemon.set(pokemon);
      this.title.setTitle(`${englishName(species.names, species.name)} – Pokédex`);
      this.typeBadges.set(
        pokemon.types
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((t) => ({
            name: t.type.name,
            enName: typeByName.get(t.type.name)?.enName ?? humanize(t.type.name),
          })),
      );
      this.evolution.set(evolution.chain);
      this.scrollToMovesSoon();

      // Version groups in which this Pokémon learns moves, ordered by their `order`.
      const groupNames = new Set<string>();
      for (const move of pokemon.moves) {
        for (const detail of move.version_group_details) groupNames.add(detail.version_group.name);
      }
      const groups = await Promise.all(
        [...groupNames].map((n) => this.api.get<{ order: number }>(`version-group/${n}`).catch(() => null)),
      );
      if (my !== this.loadToken) return;
      this.games.set(
        [...groupNames]
          .map((name, i) => ({ name, label: humanize(name), order: groups[i]?.order ?? 0 }))
          .sort((a, b) => a.order - b.order),
      );
      this.applyGameSelection();
    } catch {
      // Unexpected failure: leave the page in its loading state.
    }
  }

  private showNotFound(): void {
    this.notFound.set(true);
    this.title.setTitle('Not found – Pokédex');
  }

  private applyGameSelection(): void {
    const games = this.games();
    if (!games.length) return;
    const selected = games.find((g) => g.name === this.gameParam) ?? games[games.length - 1];
    if (selected.name === this.selectedGame()) return;
    this.selectedGame.set(selected.name);
    void this.loadTables(selected.name);
  }

  private async loadTables(gameName: string): Promise<void> {
    const pokemon = this.pokemon();
    if (!pokemon) return;
    const my = ++this.tableToken;

    // Group moves by learn method for this version group.
    const byMethod = new Map<string, Map<string, number>>();
    for (const move of pokemon.moves) {
      const details = move.version_group_details.filter((d) => d.version_group.name === gameName);
      for (const detail of details) {
        const method = detail.move_learn_method.name;
        let byMove = byMethod.get(method);
        if (!byMove) byMethod.set(method, (byMove = new Map()));
        const existing = byMove.get(move.move.name);
        if (existing === undefined || detail.level_learned_at < existing) {
          byMove.set(move.move.name, detail.level_learned_at);
        }
      }
    }

    const moveNames = new Set<string>();
    for (const byMove of byMethod.values()) for (const name of byMove.keys()) moveNames.add(name);

    const [records, typeByName] = await Promise.all([
      Promise.all([...moveNames].map((n) => this.api.get<MoveRecord>(`move/${n}`))),
      this.typeCatalog.byName(),
    ]);
    if (my !== this.tableToken || this.selectedGame() !== gameName) return;
    const recordByName = new Map(records.map((r) => [r.name, r]));

    const tables: MoveTable[] = [...byMethod.entries()].map(([method, byMove]) => {
      const rows: MoveRow[] = [...byMove.entries()].map(([moveName, level]) => {
        const record = recordByName.get(moveName);
        return {
          level: method === 'level-up' ? level : null,
          moveName,
          moveEn: englishName(record?.names, moveName),
          typeName: record?.type?.name ?? '',
          typeEn: typeByName.get(record?.type?.name ?? '')?.enName ?? humanize(record?.type?.name ?? ''),
          category: humanize(record?.damage_class?.name ?? ''),
          power: record?.power ?? null,
          accuracy: record?.accuracy ?? null,
          pp: record?.pp ?? null,
        };
      });
      if (method === 'level-up') {
        rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.moveEn.localeCompare(b.moveEn));
      } else {
        rows.sort((a, b) => a.moveEn.localeCompare(b.moveEn));
      }
      return { method, label: humanize(method), hasLevel: method === 'level-up', rows };
    });

    tables.sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a.method);
      const ib = METHOD_ORDER.indexOf(b.method);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
      return a.label.localeCompare(b.label);
    });

    this.tables.set(tables);
    this.sorts.set({});
    this.scrollToMovesSoon();
  }

  protected onGameChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const isDefault = value === this.games()[this.games().length - 1]?.name;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game: isDefault ? null : value },
      queryParamsHandling: 'merge',
      preserveFragment: true,
    });
  }

  protected ariaSort(method: string, col: string): SortDir | 'none' {
    const sort = this.sorts()[method];
    return sort?.col === col ? sort.dir : 'none';
  }

  protected toggleSort(method: string, col: string): void {
    this.sorts.update((sorts) => {
      const current = sorts[method];
      const dir: SortDir = current?.col === col && current.dir === 'ascending' ? 'descending' : 'ascending';
      return { ...sorts, [method]: { col, dir } };
    });
  }

  /**
   * Honor a `#moves` fragment once the Moves section has rendered. The section
   * grows as move tables load, so keep scrolling for a few seconds to stay put.
   */
  private scrollToMovesSoon(): void {
    if (!this.scrollPending) return;
    let attempts = 0;
    const tryScroll = (): void => {
      const el = document.getElementById('moves');
      if (el) el.scrollIntoView();
      if (++attempts < 30) {
        setTimeout(tryScroll, 100);
      } else {
        this.scrollPending = false;
      }
    };
    setTimeout(tryScroll, 50);
  }
}
