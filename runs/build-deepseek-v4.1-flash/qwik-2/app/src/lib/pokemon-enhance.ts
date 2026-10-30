export const POKEMON_ENHANCEMENT_SCRIPT = `
(function () {
  if (window.__pokedexPokemonEnhancer) return;
  window.__pokedexPokemonEnhancer = true;

  var scrollToMoves = function () {
    if (window.location.hash === "#moves") {
      var section = document.getElementById("moves");
      if (section) section.scrollIntoView();
    }
  };
  if (window.location.hash === "#moves") setTimeout(scrollToMoves, 0);
  window.addEventListener("hashchange", scrollToMoves);

  document.addEventListener("change", function (event) {
    var select = event.target && event.target.closest && event.target.closest("#game-select");
    if (!select) return;
    var url = new URL(window.location.href);
    url.searchParams.set("game", select.value);
    url.hash = "";
    window.location.assign(url.pathname + url.search);
  });

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest && event.target.closest("th[data-sort-key] button");
    if (!button) return;
    var th = button.closest("th");
    var table = th && th.closest("table.moves-table");
    if (!th || !table || !table.tBodies.length) return;
    event.preventDefault();

    var key = th.getAttribute("data-sort-key");
    var current = table.querySelector("thead th[aria-sort]");
    var currentKey = current && current.getAttribute("data-sort-key");
    var currentDirection = current && current.getAttribute("aria-sort");
    var direction = currentKey === key
      ? (currentDirection === "ascending" ? "descending" : "ascending")
      : "ascending";
    var tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);

    var valueCell = function (row) {
      return row.querySelector('[data-key="' + key + '"]');
    };
    var moveCell = function (row) {
      return row.querySelector('[data-key="move"]');
    };
    var text = function (cell) {
      return cell ? (cell.getAttribute("data-sort-value") || cell.textContent || "").trim() : "";
    };

    rows.sort(function (rowA, rowB) {
      var cellA = valueCell(rowA);
      var cellB = valueCell(rowB);
      var missingA = cellA && cellA.getAttribute("data-missing") === "1";
      var missingB = cellB && cellB.getAttribute("data-missing") === "1";
      if (missingA || missingB) {
        if (missingA && missingB) return text(moveCell(rowA)).localeCompare(text(moveCell(rowB)));
        return missingA ? 1 : -1;
      }
      var comparison;
      if (cellA && cellA.getAttribute("data-numeric") === "1") {
        comparison = Number(text(cellA)) - Number(text(cellB));
      } else {
        comparison = text(cellA).localeCompare(text(cellB));
      }
      if (comparison === 0) comparison = text(moveCell(rowA)).localeCompare(text(moveCell(rowB)));
      return direction === "ascending" ? comparison : -comparison;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });

    var headers = table.querySelectorAll("thead th");
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === th) headers[i].setAttribute("aria-sort", direction);
      else headers[i].removeAttribute("aria-sort");
    }
  });
})();
`;
