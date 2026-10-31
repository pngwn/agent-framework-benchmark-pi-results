<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MovesTable from '#lib/components/MovesTable.svelte';
  import { dexNumber } from '#lib/utils.js';

  let { data } = $props();

  onMount(() => {
    if (window.location.hash === '#moves') {
      document.getElementById('moves')?.scrollIntoView();
    }
  });

  function changeGame(event) {
    const game = event.currentTarget.value;
    goto(`?game=${encodeURIComponent(game)}#moves`);
  }
</script>

<svelte:head>
  <title>{data.name} – Pokédex</title>
</svelte:head>

<div class="surface hero">
  <div class="artwork">
    {#if data.artwork}
      <img src={data.artwork} alt={data.name} width="288" height="288" />
    {/if}
  </div>
  <div class="hero-info">
    <p class="dex">{dexNumber(data.dex)}</p>
    <h1>{data.name}</h1>
    <p class="genus">{data.genus}</p>
    <p class="hero-types">
      {#each data.types as type (type.name)}
        <a class="type-badge type-{type.name}" href="/types/{type.name}">{type.label}</a>
      {/each}
    </p>
    <dl class="facts">
      <div>
        <dt>Height</dt>
        <dd>{data.height} m</dd>
      </div>
      <div>
        <dt>Weight</dt>
        <dd>{data.weight} kg</dd>
      </div>
    </dl>
  </div>
  <p class="flavor">{data.flavor}</p>
</div>

<section class="surface" aria-labelledby="stats-heading">
  <h2 id="stats-heading">Base stats</h2>
  <table class="stats">
    <tbody>
      {#each data.stats as stat (stat.label)}
        <tr>
          <th scope="row">{stat.label}</th>
          <td class="num">{stat.value}</td>
          <td class="bar">
            <span class="stat-track">
              <span class="stat-fill" style:width="{Math.min((stat.value / 255) * 100, 100)}%"></span>
            </span>
          </td>
        </tr>
      {/each}
      <tr class="total">
        <th scope="row">Total</th>
        <td class="num">{data.total}</td>
        <td class="bar">
          <span class="stat-track">
            <span class="stat-fill" style:width="{Math.min((data.total / 255) * 100, 100)}%"></span>
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<section class="surface" aria-labelledby="abilities-heading">
  <h2 id="abilities-heading">Abilities</h2>
  <ul class="plain-list">
    {#each data.abilities as ability (ability.name)}
      <li>
        <a href="/abilities/{ability.name}">{ability.human}</a>{#if ability.hidden}{' '}<span class="muted">(hidden)</span>{/if}
      </li>
    {/each}
  </ul>
</section>

<section class="surface" aria-labelledby="evolution-heading">
  <h2 id="evolution-heading">Evolution</h2>
  {#if data.evolution}
    <ul class="evo-tree" role="list">
      {@render evolutionNode(data.evolution)}
    </ul>
  {/if}
</section>

<section class="surface" id="moves" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  {#if data.games.length}
    <div class="game-field">
      <label for="game">Game</label>
      <select id="game" value={data.game} onchange={changeGame}>
        {#each data.games as game (game.name)}
          <option value={game.name}>{game.label}</option>
        {/each}
      </select>
    </div>
    {#each data.methods as method (method.key)}
      <MovesTable title={method.title} showLevel={method.showLevel} rows={method.rows} />
    {/each}
  {/if}
</section>

{#snippet evolutionNode(node)}
  <li role="listitem">
    <a href="/pokemon/{node.name}">{node.human}</a>
    {#if node.children.length}
      <ul role="list">
        {#each node.children as child (child.name)}
          {@render evolutionNode(child)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}
