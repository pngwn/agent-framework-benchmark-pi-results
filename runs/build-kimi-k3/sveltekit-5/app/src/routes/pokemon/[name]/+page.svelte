<script>
  import { goto } from '$app/navigation';
  import MoveTable from '#lib/MoveTable.svelte';

  let { data } = $props();
  const view = $derived(data.view);

  function onGameChange(event) {
    const game = event.currentTarget.value;
    goto(`?game=${encodeURIComponent(game)}#moves`, { keepFocus: true, noScroll: true });
  }
</script>

<svelte:head>
  <title>{view.name} – Pokédex</title>
</svelte:head>

<div class="panel summary">
  {#if view.artwork}
    <img class="artwork" src={view.artwork} alt={view.name} width="288" height="288" />
  {/if}
  <div class="details">
    <p class="dex muted">{view.dex}</p>
    <h1>{view.name}</h1>
    {#if view.genus}
      <p class="genus">{view.genus}</p>
    {/if}
    {#if view.types.length}
      <p class="type-list">
        {#each view.types as type (type.name)}
          <a class="type-badge" style:background-color="var(--type-{type.name})" href={type.href}>{type.en}</a>
        {/each}
      </p>
    {/if}
    <dl class="facts">
      <div>
        <dt>Height</dt>
        <dd>{view.height}</dd>
      </div>
      <div>
        <dt>Weight</dt>
        <dd>{view.weight}</dd>
      </div>
    </dl>
    {#if view.flavor}
      <p class="flavor">{view.flavor}</p>
    {/if}
  </div>
</div>

<section class="panel" aria-labelledby="stats-heading">
  <h2 id="stats-heading">Base stats</h2>
  <table class="stats-table">
    <tbody>
      {#each view.stats as stat (stat.label)}
        <tr>
          <th scope="row">{stat.label}</th>
          <td class="num">{stat.value}</td>
          <td class="bar-cell">
            <div class="stat-bar-track">
              <div class="stat-bar" style:width="{(stat.value / 255) * 100}%"></div>
            </div>
          </td>
        </tr>
      {/each}
      <tr class="total-row">
        <th scope="row">Total</th>
        <td class="num">{view.total}</td>
        <td class="bar-cell">
          <div class="stat-bar-track">
            <div class="stat-bar" style:width="{(view.total / (255 * 6)) * 100}%"></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<section class="panel" aria-labelledby="abilities-heading">
  <h2 id="abilities-heading">Abilities</h2>
  <ul class="plain-list">
    {#each view.abilities as ability (ability.name)}
      <li>
        <a href={ability.href}>{ability.label}</a>{#if ability.hidden}{' '}<span class="muted">(hidden)</span>{/if}
      </li>
    {/each}
  </ul>
</section>

{#if view.evolution}
  <section class="panel" aria-labelledby="evolution-heading">
    <h2 id="evolution-heading">Evolution</h2>
    {#snippet evolutionNode(node)}
      <li>
        <a href={node.href}>{node.label}</a>
        {#if node.children.length}
          <ul>
            {#each node.children as child (child.name)}
              {@render evolutionNode(child)}
            {/each}
          </ul>
        {/if}
      </li>
    {/snippet}
    <ul class="plain-list evolution">
      {@render evolutionNode(view.evolution)}
    </ul>
  </section>
{/if}

<section class="panel moves" id="moves" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  {#if view.games.length}
    <div class="game-select">
      <label for="game">Game</label>
      <select id="game" onchange={onGameChange}>
        {#each view.games as game (game.name)}
          <option value={game.name} selected={game.name === view.selectedGame}>{game.label}</option>
        {/each}
      </select>
    </div>
    {#each view.tables as table (view.selectedGame + ':' + table.method)}
      <MoveTable caption={table.caption} hasLevel={table.hasLevel} rows={table.rows} />
    {/each}
  {:else}
    <p class="muted">This Pokémon learns no moves.</p>
  {/if}
</section>

<style>
  .summary {
    display: flex;
    gap: var(--space-5);
    align-items: flex-start;
  }

  .artwork {
    width: var(--artwork-size);
    height: var(--artwork-size);
    object-fit: contain;
    flex-shrink: 0;
  }

  .details {
    min-width: 0;
  }

  .dex {
    margin-bottom: var(--space-1);
    font-size: var(--text-sm);
  }

  .genus {
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
  }

  .type-list {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .facts {
    margin-bottom: var(--space-4);
  }

  .flavor {
    max-width: 65ch;
  }

  .stats-table th {
    width: 7rem;
    font-weight: var(--weight-normal);
  }

  .stats-table .num {
    width: 3rem;
  }

  .total-row th,
  .total-row .num {
    font-weight: var(--weight-semibold);
  }

  .plain-list {
    margin: 0;
    padding-left: var(--space-5);
  }

  .game-select {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .game-select label {
    margin-bottom: 0;
  }

  @media (max-width: 40rem) {
    .summary {
      flex-direction: column;
      align-items: center;
    }

    .details {
      width: 100%;
    }
  }
</style>
