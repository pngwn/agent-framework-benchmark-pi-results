import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokeApi, TypeInfo } from '../../core/poke-api';

@Component({
  selector: 'app-types-page',
  imports: [RouterLink],
  templateUrl: './types.html',
  styleUrl: './types.css',
})
export class TypesPage {
  private readonly api = inject(PokeApi);
  private readonly title = inject(Title);

  readonly types = signal<TypeInfo[]>([]);

  constructor() {
    this.title.setTitle('Types – Pokédex');
    this.api.typeInfo().then((types) => this.types.set(types));
  }
}
