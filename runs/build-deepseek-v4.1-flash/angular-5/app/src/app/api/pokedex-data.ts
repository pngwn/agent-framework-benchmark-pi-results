import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Ability,
  CardData,
  EvolutionChain,
  EvolutionLink,
  Generation,
  GenerationInfo,
  Move,
  NamedRef,
  Pokemon,
  PokemonSpecies,
  TypeData,
  TypeInfo,
  VersionGroup,
} from './pokeapi.models';
import {
  collapseWhitespace,
  compareText,
  damageClassName,
  dexNumber,
  englishGeneric,
  englishName,
  humanize,
  idFromUrl,
  statLabel,
} from './format';
import {
  AbilityPageData,
  DisplayType,
  EvolutionNode,
  GameOption,
  HomePageData,
  MovePageData,
  MoveRowData,
  MoveTableData,
  PokemonPageData,
  TypeListPageData,
  TypePageData,
} from './page-data.models';
import { PokeApi } from './pokeapi';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const RELATION_TERMS: { key: keyof TypeInfo['damageRelations']; term: string }[] = [
  { key: 'doubleDamageTo', term: 'Super effective against' },
  { key: 'halfDamageTo', term: 'Not very effective against' },
  { key: 'noDamageTo', term: 'No effect against' },
  { key: 'doubleDamageFrom', term: 'Weak to' },
  { key: 'halfDamageFrom', term: 'Resists' },
  { key: 'noDamageFrom', term: 'Immune to' },
];

interface SpeciesIndexEntry {
  id: number;
  name: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class PokedexData {
  private readonly api = inject(PokeApi);

  private speciesPromise?: Promise<SpeciesIndexEntry[]>;
  private typesPromise?: Promise<TypeInfo[]>;
  private generationsPromise?: Promise<GenerationInfo[]>;

  async getHomeData(): Promise<HomePageData> {
    const [species, types, generations] = await Promise.all([
      this.getSpeciesIndex(),
      this.getTypes(),
      this.getGenerations(),
    ]);

    const typeSlots = new Map<number, { name: string; displayName: string; slot: number }[]>();
    for (const type of types) {
      for (const entry of type.pokemonIds) {
        const list = typeSlots.get(entry.id) ?? [];
        list.push({ name: type.name, displayName: type.displayName, slot: entry.slot });
        typeSlots.set(entry.id, list);
      }
    }
    const typeByPokemon = new Map<number, DisplayType[]>();
    for (const [id, list] of typeSlots) {
      typeByPokemon.set(
        id,
        [...list]
          .sort((a, b) => a.slot - b.slot)
          .map(({ name, displayName }) => ({ name, displayName })),
      );
    }

    return {
      species: species.map((entry) => ({
        id: entry.id,
        name: entry.name,
        displayName: entry.displayName,
      })),
      types: types.map((type) => ({ name: type.name, displayName: type.displayName })),
      generations: generations.map((generation) => ({
        name: generation.name,
        label: generation.label,
        speciesIds: generation.speciesIds,
      })),
      typeByPokemon,
      typeSpeciesIds: new Map(
        types.map((type) => [type.name, [...new Set(type.pokemonIds.map((entry) => entry.id))]]),
      ),
      generationSpeciesIds: new Map(
        generations.map((generation) => [generation.name, generation.speciesIds]),
      ),
    };
  }

  async getPokemonPage(
    speciesName: string,
    requestedGame: string | null,
  ): Promise<PokemonPageData> {
    const species = await firstValueFrom(
      this.api.get<PokemonSpecies>(`/api/v2/pokemon-species/${encodeURIComponent(speciesName)}`),
    );
    const variety = species.varieties.find((item) => item.is_default) ?? species.varieties[0];
    if (!variety) throw new Error('Species has no variety');

    const [pokemon, types, evolution] = await Promise.all([
      firstValueFrom(this.api.getRef<Pokemon>(variety.pokemon)),
      this.getTypes(),
      species.evolution_chain
        ? firstValueFrom(this.api.getRef<EvolutionChain>({ url: species.evolution_chain.url }))
        : Promise.resolve(null),
    ]);

    const typeMap = new Map(types.map((type) => [type.name, type]));
    const displayType = (typeName: string): DisplayType => ({
      name: typeName,
      displayName: typeMap.get(typeName)?.displayName ?? humanize(typeName),
    });

    const sortedTypes = [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => displayType(entry.type.name));

    const flavorEntry = englishGeneric(species.flavor_text_entries);
    const artwork =
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.other?.home?.front_default ??
      pokemon.sprites.front_default ??
      '';

    const stats = pokemon.stats.map((entry) => ({
      label: statLabel(entry.stat.name),
      value: entry.base_stat,
      percent: Math.max(0, Math.min(100, (entry.base_stat / 255) * 100)),
    }));

    const abilities = [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        displayName: humanize(entry.ability.name),
        hidden: entry.is_hidden,
      }));

    const versionGroupRefs = new Map<string, NamedRef>();
    for (const move of pokemon.moves) {
      for (const detail of move.version_group_details) {
        versionGroupRefs.set(detail.version_group.name, detail.version_group);
      }
    }
    const versionGroups = (
      await Promise.all(
        [...versionGroupRefs.values()].map((ref) =>
          firstValueFrom(this.api.getRef<VersionGroup>(ref)),
        ),
      )
    ).sort((a, b) => a.order - b.order);
    const games: GameOption[] = versionGroups.map((group) => ({
      name: group.name,
      label: humanize(group.name),
    }));
    const fallbackGame = games.length ? games[games.length - 1].name : '';
    const selectedGame =
      requestedGame && games.some((game) => game.name === requestedGame)
        ? requestedGame
        : fallbackGame;

    const rowsByMethod = new Map<string, MoveRowData[]>();
    const moveRefs = new Map<string, NamedRef>();
    for (const pokemonMove of pokemon.moves) {
      for (const detail of pokemonMove.version_group_details) {
        if (detail.version_group.name !== selectedGame) continue;
        moveRefs.set(pokemonMove.move.name, pokemonMove.move);
        const method = detail.move_learn_method.name;
        const rows = rowsByMethod.get(method) ?? [];
        rows.push({
          level: method === 'level-up' ? detail.level_learned_at : null,
          moveName: pokemonMove.move.name,
          moveDisplay: '',
          typeName: '',
          typeDisplay: '',
          category: '',
          power: null,
          accuracy: null,
          pp: null,
        });
        rowsByMethod.set(method, rows);
      }
    }

    const moveDetails = new Map<string, Move>();
    await Promise.all(
      [...moveRefs.values()].map(async (ref) => {
        const move = await firstValueFrom(this.api.getRef<Move>(ref));
        moveDetails.set(move.name, move);
      }),
    );

    const methodKeys = [...rowsByMethod.keys()].sort((a, b) => {
      const aIndex = METHOD_ORDER.indexOf(a);
      const bIndex = METHOD_ORDER.indexOf(b);
      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
          (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
        );
      }
      return compareText(humanize(a), humanize(b));
    });

    const tables: MoveTableData[] = [];
    for (const methodKey of methodKeys) {
      const rows = rowsByMethod.get(methodKey);
      if (!rows?.length) continue;
      const filled = rows.map((row) => {
        const move = moveDetails.get(row.moveName);
        return {
          ...row,
          moveDisplay: englishName(move?.names) ?? humanize(row.moveName),
          typeName: move?.type.name ?? '',
          typeDisplay: move?.type.name ? displayType(move.type.name).displayName : '',
          category: move?.damage_class.name ? damageClassName(move.damage_class.name) : '',
          power: move?.power ?? null,
          accuracy: move?.accuracy ?? null,
          pp: move?.pp ?? null,
        };
      });
      filled.sort((a, b) => {
        if (methodKey === 'level-up') {
          const levelCompare =
            (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER);
          if (levelCompare !== 0) return levelCompare;
        }
        return compareText(a.moveDisplay, b.moveDisplay);
      });
      tables.push({
        method: humanize(methodKey),
        methodKey,
        isLevelUp: methodKey === 'level-up',
        rows: filled,
      });
    }

    return {
      id: species.id,
      displayName: englishName(species.names) ?? humanize(species.name),
      genus: englishGeneric(species.genera)?.genus ?? '',
      flavor: collapseWhitespace(flavorEntry?.flavor_text),
      types: sortedTypes,
      artworkUrl: artwork ? this.api.mediaUrl(artwork) : this.spriteUrl(pokemon.id),
      height: `${(pokemon.height / 10).toFixed(1)} m`,
      weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
      stats,
      total: stats.reduce((sum, stat) => sum + stat.value, 0),
      abilities,
      evolution: evolution ? this.evolutionNodes(evolution) : [],
      games,
      selectedGame,
      tables,
    };
  }

  async getMovePage(moveName: string): Promise<MovePageData> {
    const [move, species, types] = await Promise.all([
      firstValueFrom(this.api.get<Move>(`/api/v2/move/${encodeURIComponent(moveName)}`)),
      this.getSpeciesIndex(),
      this.getTypes(),
    ]);
    const type = types.find((entry) => entry.name === move.type.name);
    const shortEffect = englishGeneric(move.effect_entries)?.short_effect;
    const flavor = englishGeneric(move.flavor_text_entries)?.flavor_text;

    return {
      id: move.id,
      displayName: englishName(move.names) ?? humanize(move.name),
      type: { name: move.type.name, displayName: type?.displayName ?? humanize(move.type.name) },
      category: damageClassName(move.damage_class.name),
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      effect: collapseWhitespace(shortEffect) || collapseWhitespace(flavor) || '—',
      cards: this.cardsForPokemonRefs(move.learned_by_pokemon, species),
    };
  }

  async getAbilityPage(abilityName: string): Promise<AbilityPageData> {
    const [ability, species] = await Promise.all([
      firstValueFrom(this.api.get<Ability>(`/api/v2/ability/${encodeURIComponent(abilityName)}`)),
      this.getSpeciesIndex(),
    ]);
    return this.buildAbilityPage(ability, species);
  }

  async getTypePage(typeName: string): Promise<TypePageData> {
    const [types, species] = await Promise.all([this.getTypes(), this.getSpeciesIndex()]);
    const type = types.find((entry) => entry.name === typeName);
    if (!type) throw new Error(`Unknown type: ${typeName}`);
    const typeMap = new Map(types.map((entry) => [entry.name, entry]));
    const relationTypes = (names: string[]): DisplayType[] =>
      names.map((name) => ({
        name,
        displayName: typeMap.get(name)?.displayName ?? humanize(name),
      }));

    return {
      name: type.name,
      displayName: type.displayName,
      relations: RELATION_TERMS.map(({ key, term }) => ({
        term,
        types: relationTypes(type.damageRelations[key]),
      })),
      cards: this.cardsForPokemonRefs(
        type.pokemonIds.map((entry) => ({ name: '', url: `/api/v2/pokemon/${entry.id}/` })),
        species,
      ),
      moves: type.moves
        .map((move) => ({ name: move.name, displayName: humanize(move.name) }))
        .sort((a, b) => compareText(a.displayName, b.displayName)),
    };
  }

  async getTypeListPage(): Promise<TypeListPageData> {
    const types = await this.getTypes();
    return { types: types.map((type) => ({ name: type.name, displayName: type.displayName })) };
  }

  private buildAbilityPage(ability: Ability, species: SpeciesIndexEntry[]): AbilityPageData {
    const hidden = new Map<number, boolean>();
    for (const entry of ability.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (id === null || id >= 10000) continue;
      hidden.set(id, (hidden.get(id) ?? false) || entry.is_hidden);
    }
    const shortEffect = englishGeneric(ability.effect_entries)?.short_effect;
    const flavor = englishGeneric(ability.flavor_text_entries)?.flavor_text;
    return {
      id: ability.id,
      displayName: englishName(ability.names) ?? humanize(ability.name),
      effect: collapseWhitespace(shortEffect) || collapseWhitespace(flavor) || '—',
      cards: this.cardsForPokemonRefs(
        ability.pokemon.map((entry) => entry.pokemon),
        species,
        hidden,
      ),
    };
  }

  private getSpeciesIndex(): Promise<SpeciesIndexEntry[]> {
    if (!this.speciesPromise) {
      this.speciesPromise = firstValueFrom(this.api.getList('pokemon-species')).then((list) =>
        list.results
          .map((ref) => ({ id: idFromUrl(ref.url), name: ref.name }))
          .filter((entry): entry is { id: number; name: string } => entry.id !== null)
          .map((entry) => ({ ...entry, displayName: humanize(entry.name) }))
          .sort((a, b) => a.id - b.id),
      );
    }
    return this.speciesPromise;
  }

  private getTypes(): Promise<TypeInfo[]> {
    if (!this.typesPromise) {
      this.typesPromise = (async () => {
        const list = await firstValueFrom(this.api.getList('type'));
        const refs = list.results.filter((ref) => !EXCLUDED_TYPES.has(ref.name));
        const details = await Promise.all(
          refs.map((ref) => firstValueFrom(this.api.getRef<TypeData>(ref))),
        );
        return details.map((detail): TypeInfo => ({
          name: detail.name,
          displayName: englishName(detail.names) ?? humanize(detail.name),
          damageRelations: {
            doubleDamageTo: detail.damage_relations.double_damage_to.map((entry) => entry.name),
            halfDamageTo: detail.damage_relations.half_damage_to.map((entry) => entry.name),
            noDamageTo: detail.damage_relations.no_damage_to.map((entry) => entry.name),
            doubleDamageFrom: detail.damage_relations.double_damage_from.map((entry) => entry.name),
            halfDamageFrom: detail.damage_relations.half_damage_from.map((entry) => entry.name),
            noDamageFrom: detail.damage_relations.no_damage_from.map((entry) => entry.name),
          },
          pokemonIds: detail.pokemon
            .map((entry) => ({ id: idFromUrl(entry.pokemon.url), slot: entry.slot }))
            .filter(
              (entry): entry is { id: number; slot: number } =>
                entry.id !== null && entry.id < 10000,
            ),
          moves: detail.moves,
        }));
      })();
    }
    return this.typesPromise;
  }

  private getGenerations(): Promise<GenerationInfo[]> {
    if (!this.generationsPromise) {
      this.generationsPromise = (async () => {
        const list = await firstValueFrom(this.api.getList('generation'));
        const details = await Promise.all(
          list.results.map((ref) => firstValueFrom(this.api.getRef<Generation>(ref))),
        );
        return details.map((generation) => ({
          name: generation.name,
          label: englishName(generation.names) ?? humanize(generation.name),
          speciesIds: [
            ...new Set(
              generation.pokemon_species
                .map((ref) => idFromUrl(ref.url))
                .filter((id): id is number => id !== null && id < 10000),
            ),
          ],
        }));
      })();
    }
    return this.generationsPromise;
  }

  private cardsForPokemonRefs(
    refs: NamedRef[],
    species: SpeciesIndexEntry[],
    hidden?: Map<number, boolean>,
  ): CardData[] {
    const speciesById = new Map(species.map((entry) => [entry.id, entry]));
    const ids = new Set<number>();
    for (const ref of refs) {
      const id = idFromUrl(ref.url);
      if (id === null || id >= 10000 || !speciesById.has(id)) continue;
      ids.add(id);
    }
    return [...ids]
      .sort((a, b) => a - b)
      .map((id) => {
        const entry = speciesById.get(id)!;
        return {
          id,
          speciesName: entry.name,
          displayName: humanize(entry.name),
          dex: dexNumber(id),
          spriteUrl: this.spriteUrl(id),
          types: [],
          hiddenAbility: hidden?.get(id) === true,
        };
      });
  }

  private evolutionNodes(chain: EvolutionChain): EvolutionNode[] {
    const walk = (link: EvolutionLink): EvolutionNode => ({
      name: link.species.name,
      displayName: humanize(link.species.name),
      children: (link.evolves_to ?? []).map((child) => walk(child)),
    });
    return [walk(chain.chain)];
  }

  private spriteUrl(id: number): string {
    return `${this.api.baseUrl}/media/sprites/pokemon/${id}.png`;
  }
}
