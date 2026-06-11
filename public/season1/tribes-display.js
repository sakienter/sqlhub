const S1_TRIBE_API_URL = '/api/season1/tribes';
let s1TribeConfig = {};

fetch(S1_TRIBE_API_URL, { cache: 'no-store' })
  .then(response => response.ok ? response.json() : {})
  .then(config => {
    s1TribeConfig = config || {};
    if (typeof renderSelectedGame === 'function') renderSelectedGame(selectedGameIndex || 0);
  })
  .catch(error => console.error(error));

const s1OriginalRenderGameMeta = renderGameMeta;
renderGameMeta = function renderGameMetaWithTribes(game) {
  if (!game) {
    s1OriginalRenderGameMeta(game);
    if (elements.gameBan) elements.gameBan.innerHTML = renderS1TribeInfo(null);
    return;
  }

  s1OriginalRenderGameMeta(game);
  if (elements.gameBan) elements.gameBan.innerHTML = renderS1TribeInfo(game);
};

function renderS1TribeInfo(game) {
  const info = getS1TribeInfo(game);
  const available = info.available.length ? info.available.join(', ') : '-';
  const unavailable = info.unavailable.length ? info.unavailable.join(', ') : '-';
  return `BAN）登場種族：${escapeHtml(available)}<br><span class="ban-subline">非登場種族：${escapeHtml(unavailable)}</span>`;
}

function getS1TribeInfo(game) {
  const day = loadedData?.days?.[selectedDayIndex];
  const dayKey = normalizeS1Key(day?.label || `DAY${selectedDayIndex + 1}`);
  const gameKey = normalizeS1Key(game?.label || `GAME${selectedGameIndex + 1}`);
  const info = s1TribeConfig?.[dayKey]?.[gameKey] || {};
  return {
    available: Array.isArray(info.available) ? info.available.filter(Boolean) : [],
    unavailable: Array.isArray(info.unavailable) ? info.unavailable.filter(Boolean) : []
  };
}

function normalizeS1Key(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}
