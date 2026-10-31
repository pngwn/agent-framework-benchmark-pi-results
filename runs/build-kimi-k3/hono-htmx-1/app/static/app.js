// Drop empty/default parameters from htmx requests so URLs stay clean
// (e.g. /?type=water instead of /?q=&type=water&generation=).
document.addEventListener('htmx:configRequest', (event) => {
  const params = event.detail.parameters;
  for (const key of Object.keys(params)) {
    if (params[key] === '' || params[key] == null) delete params[key];
  }
});
