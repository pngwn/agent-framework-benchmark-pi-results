import { query } from "@solidjs/router";
import {
  loadAbilityPageData,
  loadHomeData,
  loadMovePageData,
  loadPokemonPageData,
  loadTypeListData,
  loadTypePageData,
} from "./api";

export const getHomeData = query(async () => {
  "use server";
  return loadHomeData();
}, "home-data");

export const getPokemonPageData = query(async (name: string) => {
  "use server";
  return loadPokemonPageData(name);
}, "pokemon-data");

export const getMovePageData = query(async (name: string) => {
  "use server";
  return loadMovePageData(name);
}, "move-data");

export const getAbilityPageData = query(async (name: string) => {
  "use server";
  return loadAbilityPageData(name);
}, "ability-data");

export const getTypeListData = query(async () => {
  "use server";
  return loadTypeListData();
}, "type-list");

export const getTypePageData = query(async (name: string) => {
  "use server";
  return loadTypePageData(name);
}, "type-data");
