(() => {
  const form = document.getElementById('filters');
  const results = document.getElementById('results');
  if (!form || !results) return;

  const search = document.getElementById('search');
  const type = document.getElementById('type-filter');
  const generation = document.getElementById('generation-filter');

  let timer = null;
  let seq = 0;

  form.addEventListener('submit', (event) => event.preventDefault());

  const apply = async () => {
    const params = new URLSearchParams();
    if (search.value.trim()) params.set('q', search.value.trim());
    if (type.value) params.set('type', type.value);
    if (generation.value) params.set('generation', generation.value);
    const qs = params.toString();
    const url = qs ? `/?${qs}` : '/';
    history.pushState(null, '', url);
    const mySeq = ++seq;
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (mySeq !== seq) return; // a newer request superseded this one
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const fresh = doc.getElementById('results');
      if (fresh) results.innerHTML = fresh.innerHTML;
    } catch {
      // Network hiccup: leave the current results in place.
    }
  };

  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 200);
  });
  type.addEventListener('change', apply);
  generation.addEventListener('change', apply);

  window.addEventListener('popstate', () => location.reload());
})();
