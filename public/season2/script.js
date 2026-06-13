(() => {
  document.querySelector('.meta-line')?.remove();

  const cacheNote = document.querySelector('.cache-note');
  if (cacheNote) {
    cacheNote.textContent = '初回表示・更新直後はデータ取得に時間がかかる場合があります。';
  }

  const placeholder = document.getElementById('composition-placeholder');
  if (placeholder) placeholder.textContent = '未実施';

  [
    '../season1/meta-layout.css?v=s2-s1-parity-20260613',
    '../season1/tribe-image-zoom.css?v=s2-s1-parity-20260613',
    './parity.css?v=s2-s1-parity-20260613'
  ].forEach(href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });

  const parityScript = document.createElement('script');
  parityScript.src = './parity.js?v=s2-s1-parity-20260613';
  parityScript.async = false;
  parityScript.onerror = () => {
    const overlay = document.getElementById('loading-overlay');
    overlay?.remove();
    if (placeholder) placeholder.textContent = '未実施';
  };
  document.body.appendChild(parityScript);
})();
