<svelte:head>
  <title>{data.notFound ? 'Not found – Pokédex' : data.species.englishName + ' – Pokédex'}</title>
</svelte:head>

<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { humanize } from '#lib/format.js';
  import MoveTable from '#lib/components/MoveTable.svelte';
  import NotFound from '#lib/components/NotFound.svelte';

  let { data } = $props();

  function changeGame(event) {
    const game = event.currentTarget.value;
    const params = new URLSearchParams(page.url.searchParams);
    params.set('game', game);
    goto(`/pokemon/${data.species.name}?${params.toString()}${page.url.hash}`, {
      keepFocus: true,
      noScroll: true,
      replaceState: true
    });
  }
</script>

{#if data.notFound}
  <NotFound />
{:else}

  <div class="pokemon-hero">
    <div class="artwork-card">
      {#if data.species.artwork}
        <img
          class="artwork"
          src={data.species.artwork}
          alt={data.species.englishName}
          width="288"
          height="288"
        />
      {/if}
    </div>
    <div class="hero-info">
      <p class="dex">#{String(data.species.id).padStart(4, '0')}</p>
      <h1>{data.species.englishName}</h1>
      {#if data.species.genus}
        <p class="genus">{data.species.genus}</p>
      {/if}
      <ul class="type-row hero-types">
        {#each data.species.types as type}
          <li><a class="type-badge type-{type.name}" href={`/types/${type.name}`}>{type.label}</a></li>
        {/each}
      </ul>
      <dl class="measures">
        <div>
          <dt>Height</dt>
          <dd>{(data.height / 10).toFixed(1)} m</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{(data.weight / 10).toFixed(1)} kg</dd>
        </div>
      </dl>
      {#if data.species.flavorText}
        <p class="flavor">{data.species.flavorText}</p>
      {/if}
    </div>
  </div>

  <section class="panel" aria-labelledby="stats-heading">
    <h2 id="stats-heading">Base stats</h2>
    <table class="stats-table">
      <tbody>
        {#each data.stats as stat}
          <tr>
            <th scope="row">{stat.label}</th>
            <td>{stat.value}</td>
            <td class="bar-cell">
              <span class="bar-track">
                <span
                  class="bar-fill"
                  style={`width: ${Math.min(100, (stat.value / 255) * 100)}%`}
                ></span>
              </span>
            </td>
          </tr>
        {/each}
        <tr class="total-row">
          <th scope="row">Total</th>
          <td>{data.total}</td>
          <td class="bar-cell">
            <span class="bar-track">
              <span
                class="bar-fill"
                style={`width: ${Math.min(100, (data.total / (255 * 6)) * 100)}%`}
              ></span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel" aria-labelledby="abilities-heading">
    <h2 id="abilities-heading">Abilities</h2>
    <ul class="link-list">
      {#each data.abilities as ability}
        <li>
          <a href={`/abilities/${ability.name}`}>{ability.label}</a>{#if ability.hidden}{' '}<span class="muted">(hidden)</span>{/if}
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel" aria-labelledby="evolution-heading">
    <h2 id="evolution-heading">Evolution</h2>
    {#if data.evolution}
      {#snippet evolutionNode(node)}
        <li>
          <a href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</a>
          {#if node.evolves_to?.length}
            <ul>
              {#each node.evolves_to as child}
                {@render evolutionNode(child)}
              {/each}
            </ul>
          {/if}
        </li>
      {/snippet}
      <ul class="evolution-list">
        {@render evolutionNode(data.evolution)}
      </ul>
    {/if}
  </section>

  <section id="moves" class="panel" aria-labelledby="moves-heading">
    <h2 id="moves-heading">Moves</h2>
    {#if data.games.length}
      <div class="game-field">
        <label for="game">Game</label>
        <select id="game" onchange={changeGame}>
          {#each data.games as game}
            <option value={game.name} selected={data.selectedGame?.name === game.name}>{game.label}</option>
          {/each}
        </select>
      </div>

      {#each data.tables as table (table.method)}
        <MoveTable {table} />
      {/each}
    {/if}
  </section>
{/if}
