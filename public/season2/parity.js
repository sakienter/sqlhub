(() => {
  const files = ['parity-config.js', 'parity-summary.js', 'parity-render.js', 'parity-extras.js'];
  const version = 's2-s1-parity-20260613-r2';

  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `./${src}?v=${version}`;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  (async () => {
    for (const file of files) await load(file);
  })().catch(error => {
    console.error('Season 2 parity scripts failed to load.', error);
    document.getElementById('loading-overlay')?.remove();
    const placeholder = document.getElementById('composition-placeholder');
    if (placeholder) placeholder.textContent = '未実施';
  });
})();
