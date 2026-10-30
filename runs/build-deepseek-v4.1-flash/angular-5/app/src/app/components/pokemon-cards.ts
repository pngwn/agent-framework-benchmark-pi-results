import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardData } from '../api/pokeapi.models';

@Component({
  selector: 'app-pokemon-cards',
  imports: [RouterLink],
  templateUrl: './pokemon-cards.html',
})
export class PokemonCards {
  readonly cards = input.required<CardData[]>();
  readonly showTypes = input(false);
}
