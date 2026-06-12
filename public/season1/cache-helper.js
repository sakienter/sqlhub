(() => {
  const API_PATH = '/api/results';
  const STATIC_RESULTS_PATH = './results.json?v=s1-static-20260613';
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;

    if (!isResultsRequest(url)) {
      return originalFetch(input, init);
    }

    setStatus('アーカイブデータを読み込み中...');
    return originalFetch(STATIC_RESULTS_PATH, { ...init, cache: 'no-store' });
  };

  function isResultsRequest(url) {
    if (!url) return false;
    try {
      return new URL(url, window.location.origin).pathname === API_PATH;
    } catch {
      return String(url).includes(API_PATH);
    }
  }

  function setStatus(text) {
    const el = document.getElementById('data-status');
    if (el) el.textContent = text;
  }
})();
