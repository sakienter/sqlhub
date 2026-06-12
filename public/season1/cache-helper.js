(() => {
  const API_PATH = '/api/results';
  const ARCHIVE_VERSION = 's1-archive-pdf-20260613-corrections';
  const ARCHIVE_PARTS = [
    './archive/summary.json',
    './archive/day1.json',
    './archive/day2.json',
    './archive/day3.json',
    './archive/day4.json'
  ];
  const CORRECTIONS_PATH = './archive/corrections.json';
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

    const corrections = await loadCorrections(init);
    const days = applyCorrections(dayParts, corrections);

    return {
      title: summaryPart.title,
      updatedAt: summaryPart.updatedAt,
      source: summaryPart.source,
      note: summaryPart.note,
      summary: summaryPart.summary,
      days
    };
  }

  async function loadCorrections(init) {
    try {
      const response = await originalFetch(`${CORRECTIONS_PATH}?v=${encodeURIComponent(ARCHIVE_VERSION)}`, { ...init, cache: 'no-store' });
      if (!response.ok) return {};
      return await response.json();
    } catch (error) {
      console.warn('S1 correction load failed', error);
      return {};
    }
  }

  function applyCorrections(days, corrections) {
    if (!corrections || typeof corrections !== 'object') return days;

    days.forEach((day, dayIndex) => {
      const dayKey = normalizeKey(day?.label || `DAY${dayIndex + 1}`);
      const dayCorrections = corrections[dayKey];
      if (!dayCorrections || typeof dayCorrections !== 'object') return;

      (day.gameDetails || []).forEach((game, gameIndex) => {
        const gameKey = normalizeKey(game?.label || `GAME${gameIndex + 1}`);
        const gameCorrections = dayCorrections[gameKey];
        if (!gameCorrections || typeof gameCorrections !== 'object') return;

        (game.rows || []).forEach(row => {
          const rowCorrections = gameCorrections[row.name];
          if (!rowCorrections || typeof rowCorrections !== 'object') return;
          Object.assign(row, rowCorrections);
        });
      });
    });

    return days;
  }

  function normalizeKey(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
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
