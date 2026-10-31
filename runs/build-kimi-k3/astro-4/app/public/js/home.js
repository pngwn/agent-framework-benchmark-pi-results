// Home page: filters update the URL query (and go back to page 1).
// The server renders the filtered view, so state lives entirely in the URL.
(function () {
  const form = document.querySelector('[data-controls]');
  if (!form) return;
  const q = form.querySelector('input[name="q"]');
  const type = form.querySelector('select[name="type"]');
  const generation = form.querySelector('select[name="generation"]');

  const apply = () => {
    const params = new URLSearchParams();
    if (q.value) params.set('q', q.value);
    if (type.value) params.set('type', type.value);
    if (generation.value) params.set('generation', generation.value);
    const query = params.toString();
    location.assign(query ? `/?${query}` : '/');
  };

  let timer;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 250);
  });
  type.addEventListener('change', apply);
  generation.addEventListener('change', apply);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(timer);
    apply();
  });
})();
