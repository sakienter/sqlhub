(() => {
  const API_PATH = '/api/results';
  const ARCHIVE_VERSION = 's1-archive-pdf-20260613';
  const ARCHIVE_PARTS = [
    './archive/summary.json',
    './archive/day1.json',
    './archive/day2.json',
    './archive/day3.json',
    './archive/day4.json'
  ];
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;

    if (!isResultsRequest(url)) {
      return originalFetch(input, init);
    }

    setStatus('アーカイブデータを読み込み中...');
    try {
      const archive = await loadArchive(init);
      return new Response(JSON.stringify(archive), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    } catch (error) {
      console.warn('S1 archive load failed', error);
      return originalFetch(`./results.json?v=${encodeURIComponent(ARCHIVE_VERSION)}`, { ...init, cache: 'no-store' });
    }
  };

  async function loadArchive(init) {
    const [summaryPart, ...dayParts] = await Promise.all(
      ARCHIVE_PARTS.map(path => originalFetch(`${path}?v=${encodeURIComponent(ARCHIVE_VERSION)}`, { ...init, cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        return response.json();
      }))
    );

    return {
      title: summaryPart.title,
      updatedAt: summaryPart.updatedAt,
      source: summaryPart.source,
      note: summaryPart.note,
      summary: summaryPart.summary,
      days: dayParts
    };
  }

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
