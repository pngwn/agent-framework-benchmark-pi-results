<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import EvoNode from '#lib/EvoNode.svelte';
  import MoveTable from '#lib/MoveTable.svelte';

  let { data } = $props();

  function onGameChange(event) {
    const game = event.currentTarget.value;
    goto(`/pokemon/${data.name}?game=${encodeURIComponent(game)}${page.url.hash}`, {
      noScroll: true,
      keepFocus: true,
    });
  }

  const statBarWidth = (value) => Math.min(100, (value / 200) * 100);
  const totalBarWidth = (value) => Math.min(100, (value / 720) * 100);
</script>

<svelte:head>
  <title>{data.en} – Pokédex</title>
</svelte:head>

<div class="summary surface">
  {#if data.artwork}
    <img class="artwork" src={data.artwork} alt={data.en} width="288" height="288" />
  {/if}
  <div class="summary-info">
    <p class="dex">{data.dex}</p>
    <h1>{data.en}</h1>
    <p class="genus">{data.genus}</p>
    <ul class="badges">
      {#each data.types as type (type.name)}
        <li><a class="badge type-{type.name}" href="/types/{type.name}">{type.en}</a></li>
      {/each}
    </ul>
    <dl class="measurements">
      <div>
        <dt>Height</dt>
        <dd>{data.height}</dd>
      </div>
      <div>
        <dt>Weight</dt>
        <dd>{data.weight}</dd>
      </div>
    </dl>
  </div>
  <p class="flavor">{data.flavor}</p>
</div>

<section class="surface" aria-labelledby="stats-heading">
  <h2 id="stats-heading">Base stats</h2>
  <table class="stats-table">
    <tbody>
      {#each data.stats as stat (stat.label)}
        <tr>
          <th scope="row">{stat.label}</th>
          <td class="num">{stat.value}</td>
          <td class="bar">
            <div class="track" aria-hidden="true">
              <div class="fill" style="width: {statBarWidth(stat.value)}%"></div>
            </div>
          </td>
        </tr>
      {/each}
      <tr>
        <th scope="row">Total</th>
        <td class="num">{data.total}</td>
        <td class="bar">
          <div class="track" aria-hidden="true">
            <div class="fill" style="width: {totalBarWidth(data.total)}%"></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</section>

<section class="surface" aria-labelledby="abilities-heading">
  <h2 id="abilities-heading">Abilities</h2>
  <ul class="link-list">
    {#each data.abilities as ability (ability.name)}
      <li>
        <a href="/abilities/{ability.name}">{ability.label}</a>{ability.hidden ? ' (hidden)' : ''}
      </li>
    {/each}
  </ul>
</section>

<section class="surface" aria-labelledby="evolution-heading">
  <h2 id="evolution-heading">Evolution</h2>
  <ul class="link-list">
    <EvoNode node={data.evolution} />
  </ul>
</section>

<section class="surface" aria-labelledby="moves-heading" id="moves">
  <h2 id="moves-heading">Moves</h2>
  <div class="game-filter">
    <label for="game">Game</label>
    <select id="game" data-game value={data.selectedGame} onchange={onGameChange}>
      {#each data.games as game (game.name)}
        <option value={game.name}>{game.label}</option>
      {/each}
    </select>
  </div>
  {#each data.methods as method (method.name)}
    <MoveTable label={method.label} hasLevel={method.name === 'level-up'} rows={method.rows} />
  {/each}
</section>
