// htmx tweaks: drop empty form parameters from outgoing requests so the URLs
// pushed to the history only contain active filters.
document.addEventListener('htmx:configRequest', (event) => {
  const params = event.detail.parameters;
  for (const key of Object.keys(params)) {
    if (params[key] === '') delete params[key];
  }
});
