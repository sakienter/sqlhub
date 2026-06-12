(() => {
  const API_PATH = '/api/results';
  const CACHE_KEY = 'sqlhub:season1:results:v1';
  const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const FIRST_VIEW_DELAY_MS = 900;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;

    if (!isResultsRequest(url)) {
      return originalFetch(input, init);
    }

    const cachedData = readCache();

    if (cachedData) {
      setStatus('キャッシュ表示中 / 最新データ確認中...');
      refreshCacheInBackground(input, init);
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    return originalFetch(input, init).then(cacheResponse);
  };

  window.setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      window.setTimeout(() => overlay.remove(), 500);
    }

    setStatus('読み込み中... ページを表示しています');
    setPlaceholderRows();
  }, FIRST_VIEW_DELAY_MS);

  function isResultsRequest(url) {
    if (!url) return false;
    try {
      return new URL(url, window.location.origin).pathname === API_PATH;
    } catch {
      return String(url).includes(API_PATH);
    }
  }

  function refreshCacheInBackground(input, init) {
    originalFetch(input, { ...init, cache: 'reload' })
      .then(cacheResponse)
      .catch(error => console.warn('S1 background cache refresh failed', error));
  }

  async function cacheResponse(response) {
    if (!response || !response.ok) return response;

    response.clone().json()
      .then(writeCache)
      .catch(error => console.warn('S1 response cache failed', error));

    return response;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data || !parsed.savedAt) return null;
      if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;

      return parsed.data;
    } catch (error) {
      console.warn('S1 cache read failed', error);
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (error) {
      console.warn('S1 cache write failed', error);
    }
  }

  function setStatus(text) {
    const el = document.getElementById('data-status');
    if (el) el.textContent = text;
  }

  function setPlaceholderRows() {
    setPlaceholder('summary-table', '結果データを読み込んでいます');
    setPlaceholder('daily-score-table', 'DAYデータを読み込んでいます');
    setPlaceholder('day-points-table', 'ポイント集計を読み込んでいます');
    setPlaceholder('day-placements-table', '順位入力データを読み込んでいます');
    setPlaceholder('game-detail-table', 'ゲーム別詳細を読み込んでいます');
  }

  function setPlaceholder(tableId, message) {
    const table = document.getElementById(tableId);
    if (!table || table.querySelector('tbody tr')) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    const headerRow = document.createElement('tr');
    const headerCell = document.createElement('th');
    headerCell.textContent = '読み込み中';
    headerRow.appendChild(headerCell);
    thead.appendChild(headerRow);

    const bodyRow = document.createElement('tr');
    const bodyCell = document.createElement('td');
    bodyCell.className = 'empty-cell';
    bodyCell.textContent = message;
    bodyRow.appendChild(bodyCell);
    tbody.appendChild(bodyRow);
  }
})();
