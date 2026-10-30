import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { humanize, padDex } from '../core/format';
import type { Pokemon } from '../core/models';

export interface CardType {
  name: string;
  displayName: string;
}

@Component({
  selector: 'app-pokemon-card',
  imports: [RouterLink],
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem' },
})
export class PokemonCardComponent {
  private readonly api = inject(ApiService);

  readonly speciesName = input.required<string>();
  readonly pokemonId = input.required<number>();
  readonly types = input<CardType[]>([]);
  readonly hiddenAbility = input(false);

  protected readonly dex = computed(() => padDex(this.pokemonId()));
  protected readonly displayName = computed(() => humanize(this.speciesName()));
  protected readonly spriteUrl = computed(() => this.api.spriteFor(this.pokemonId()));

  private triedFallback = false;

  protected onImageError(event: Event): void {
    if (this.triedFallback) return;
    this.triedFallback = true;
    const image = event.target as HTMLImageElement;
    this.api.get<Pokemon>(`/pokemon/${this.pokemonId()}/`).subscribe({
      next: (pokemon) => {
        const fallback = pokemon.sprites?.front_default;
        if (fallback) image.src = this.api.mediaUrl(fallback);
      },
    });
  }
}
