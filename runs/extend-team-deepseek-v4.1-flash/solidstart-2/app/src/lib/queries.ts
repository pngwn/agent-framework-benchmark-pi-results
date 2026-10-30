import { query } from "@solidjs/router";
import {
  abilityDetail,
  homeFilters,
  homeList,
  moveDetail,
  pokemonDetail,
  pokemonMoves,
  typeDetail,
  typeList,
  teamDetail,
  teamNames,
} from "./server/pokeapi";

export const getHomeFilters = query(async () => {
  "use server";
  return homeFilters();
}, "home-filters");

export const getHomeList = query(async (q: string, type: string, generation: string, page: number) => {
  "use server";
  return homeList(q, type, generation, page);
}, "home-list");

export const getPokemon = query(async (name: string) => {
  "use server";
  return pokemonDetail(name);
}, "pokemon");

export const getPokemonMoves = query(async (name: string, game: string) => {
  "use server";
  return pokemonMoves(name, game);
}, "pokemon-moves");

export const getMove = query(async (name: string) => {
  "use server";
  return moveDetail(name);
}, "move");

export const getAbility = query(async (name: string) => {
  "use server";
  return abilityDetail(name);
}, "ability");

export const getTypes = query(async () => {
  "use server";
  return typeList();
}, "types");

export const getType = query(async (name: string) => {
  "use server";
  return typeDetail(name);
}, "type");

export const getTeamNames = query(async () => {
  "use server";
  return teamNames();
}, "team-names");

export const getTeam = query(async (names: string[]) => {
  "use server";
  return teamDetail(names);
}, "team");
