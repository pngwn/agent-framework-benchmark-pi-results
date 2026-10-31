import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokeApi } from './api';
import { dexNumber } from './util';

export interface CardType {
  name: string;
  en: string;
}

/**
 * A Pokémon card: a link to the species page with the front sprite, the dex
 * number and the humanized species name. Used as `<li app-pokemon-card>`
 * inside a `<ul class="cards">`.
 */
@Component({
  selector: 'li[app-pokemon-card]',
  imports: [RouterLink],
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.css',
})
export class PokemonCard {
  private readonly api = inject(PokeApi);

  readonly id = input.required<number>();
  readonly speciesName = input.required<string>();
  readonly name = input.required<string>();
  /** Type badges to show (home page only). */
  readonly types = input<CardType[] | null>(null);
  /** Whether to note that this is a hidden ability (ability page only). */
  readonly hidden = input(false);

  protected readonly dex = computed(() => dexNumber(this.id()));
  protected readonly sprite = computed(() => this.api.spriteUrl(this.id()));
}
