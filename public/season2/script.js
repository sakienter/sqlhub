const API_URL = '/api/season2/results';
const TRIBE_API_URL = '/api/season2/tribes';
const RESULTS_CACHE_KEY = 'sqlhub:season2:results:v3';
const TRIBE_CACHE_KEY = 'sqlhub:season2:tribes:v1';
const CACHE_MAX_AGE_MS = 3 * 60 * 1000;

let loadedData = null;
let tribeConfig = {};
let selectedDayIndex = 0;
let selectedGameIndex = 0;
let hasRenderedCachedData = false;

const $ = id => document.getElementById(id);
const elements = {
  eventTitle: $('event-title'),
  dataStatus: $('data-status'),
  updatedAt: $('updated-at'),
  summaryTable: $('summary-table'),
  dayTabs: $('day-tabs'),
  dayTitle: $('day-title'),
  dailyScoreTable: $('daily-score-table'),
  dayPointsTable: $('day-points-table'),
  dayPlacementsTable: $('day-placements-table'),
  gameTabs: $('game-tabs'),
  gameTitle: $('game-title'),
  gameStartTime: $('game-start-time'),
  gameEndTime: $('game-end-time'),
  gameBan: $('game-ban'),
  gameAnomaly: $('game-anomaly'),
  gameDetailTable: $('game-detail-table')
};

init();

async function init() {
  startLoadingDots();
  setStatus('読み込み中...');

  const cachedResults = readLocalCache(RESULTS_CACHE_KEY);
  const cachedTribes = readLocalCache(TRIBE_CACHE_KEY);

  if (cachedTribes) tribeConfig = cachedTribes;

  if (cachedResults) {
    hasRenderedCachedData = true;
    loadedData = cachedResults;
    renderPage(loadedData);
    setStatus('キャッシュ表示中 / 最新データ確認中...');
    hideLoadingOverlay();
  }

  const tribePromise = fetchJson(TRIBE_API_URL, { cache: 'default' })
    .then(data => {
      tribeConfig = data || {};
      writeLocalCache(TRIBE_CACHE_KEY, tribeConfig);
      refreshCurrentGameMeta();
    })
    .catch(error => {
      console.warn('tribe config fetch failed', error);
    });

  try {
    const data = await fetchJson(API_URL, { cache: 'default' });
    loadedData = data;
    writeLocalCache(RESULTS_CACHE_KEY, data);
    renderPage(loadedData, { keepSelection: hasRenderedCachedData });
    setStatus(hasRenderedCachedData ? '最新データに更新しました' : '読み込み完了');
    hideLoadingOverlay();
  } catch (e) {
    console.error(e);
    if (hasRenderedCachedData) {
      setStatus('キャッシュ表示中 / 最新データの取得に失敗しました');
    } else {
      setStatus('読み込みに失敗しました');
      renderError(e);
      hideLoadingOverlay();
    }
  } finally {
    await tribePromise;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

function readLocalCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;

    return parsed.data;
  } catch (error) {
    console.warn('local cache read failed', error);
    return null;
  }
}

function writeLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch (error) {
    console.warn('local cache write failed', error);
  }
}

function startLoadingDots() {
  const el = $('ld-dots');
  if (!el) return;
  let i = 0;
  const frames = ['', '.', '..', '...'];
  window._ldTimer = setInterval(() => { el.textContent = frames[i++ % frames.length]; }, 400);
}

function hideLoadingOverlay() {
  const overlay = $('loading-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;
  clearInterval(window._ldTimer);
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 500);
}

function renderPage(data, options = {}) {
  if (data.title && elements.eventTitle) {
    elements.eventTitle.textContent = data.title;
    document.title = data.title;
  }
  if (data.updatedAt && elements.updatedAt) {
    elements.updatedAt.textContent = '更新: ' + formatDateTime(data.updatedAt);
  }

  renderSummary(data.summary || {});

  const days = data.days || [];
  if (options.keepSelection && days.length) {
    selectedDayIndex = Math.min(selectedDayIndex, days.length - 1);
  } else {
    selectedDayIndex = 0;
    selectedGameIndex = 0;
  }

  renderDayTabs(days);
  if (days.length) renderSelectedDay(selectedDayIndex, { keepGameSelection: options.keepSelection });
}

function renderSummary(summary) {
  renderTable(elements.summaryTable, summary.headers || [], summary.rows || [], { winnerKey: 'rank', summaryTable: true });
}

function renderDayTabs(days) {
  if (!elements.dayTabs) return;
  elements.dayTabs.innerHTML = '';
  days.forEach((day, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-tab' + (index === selectedDayIndex ? ' active' : '');
    button.innerHTML = `<span class="tab-main">${esc(day.label || `DAY${index + 1}`)}</span><span class="tab-sub">${esc(day.date || '')}</span>`;
    button.addEventListener('click', () => renderSelectedDay(index));
    elements.dayTabs.appendChild(button);
  });
}

function renderSelectedDay(index, options = {}) {
  const day = loadedData?.days?.[index];
  if (!day) return;

  selectedDayIndex = index;
  if (options.keepGameSelection) {
    selectedGameIndex = Math.min(selectedGameIndex, Math.max((day.gameDetails || []).length - 1, 0));
  } else {
    selectedGameIndex = 0;
  }

  updateActive(elements.dayTabs, '.day-tab', index);

  if (elements.dayTitle) {
    const label = day.label || `DAY${index + 1}`;
    const date = day.date ? ` / ${day.date}` : '';
    elements.dayTitle.textContent = `${label}${date}`;
  }

  renderTable(elements.dailyScoreTable, day.dailyScore?.headers || [], day.dailyScore?.rows || [], { winnerKey: 'rank' });
  renderTable(elements.dayPointsTable, day.points?.headers || [], day.points?.rows || [], { winnerKey: 'rank' });
  renderTable(elements.dayPlacementsTable, day.placements?.headers || [], day.placements?.rows || [], {});
  renderGameTabs(day);
  renderSelectedGame(selectedGameIndex);
}

function renderGameTabs(day) {
  if (!elements.gameTabs) return;
  elements.gameTabs.innerHTML = '';
  (day.gameDetails || []).forEach((game, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-tab' + (index === selectedGameIndex ? ' active' : '');
    button.innerHTML = `<span class="tab-main">${esc(game.label || `GAME${index + 1}`)}</span><span class="tab-sub">${esc(timeShort(game))}</span>`;
    button.addEventListener('click', () => renderSelectedGame(index));
    elements.gameTabs.appendChild(button);
  });
}

function renderSelectedGame(index) {
  const day = loadedData?.days?.[selectedDayIndex];
  const game = day?.gameDetails?.[index];
  selectedGameIndex = index;
  updateActive(elements.gameTabs, '.game-tab', index);

  if (!game) {
    renderGameMeta(null);
    renderTable(elements.gameDetailTable, [], [], {});
    return;
  }

  renderGameMeta(game);
  renderTable(elements.gameDetailTable, game.headers || [], game.rows || [], { winnerKey: 'placement' });
}

function refreshCurrentGameMeta() {
  const day = loadedData?.days?.[selectedDayIndex];
  const game = day?.gameDetails?.[selectedGameIndex];
  if (game) renderGameMeta(game);
}

function updateActive(parent, selector, index) {
  if (!parent) return;
  parent.querySelectorAll(selector).forEach((button, i) => button.classList.toggle('active', i === index));
}

function renderGameMeta(game) {
  if (elements.gameTitle) elements.gameTitle.textContent = game?.label || 'GAME';
  if (elements.gameStartTime) elements.gameStartTime.textContent = '開始: ' + (game?.startTime || '-');
  if (elements.gameEndTime) elements.gameEndTime.textContent = '終了: ' + (game?.endTime || '-');
  if (elements.gameBan) elements.gameBan.innerHTML = renderTribeInfo(game);
  if (elements.gameAnomaly) elements.gameAnomaly.textContent = '異常: ' + (game?.anomaly || '-');
}

function renderTribeInfo(game) {
  const info = getTribeInfo(game);
  const available = info.available.length ? info.available.join(', ') : '-';
  const unavailable = info.unavailable.length ? info.unavailable.join(', ') : '-';
  return `BAN）登場種族：${esc(available)}<br><span class="ban-subline">非登場種族：${esc(unavailable)}</span>`;
}

function getTribeInfo(game) {
  const day = loadedData?.days?.[selectedDayIndex];
  const dayKey = normalizeKey(day?.label || `DAY${selectedDayIndex + 1}`);
  const gameKey = normalizeKey(game?.label || `GAME${selectedGameIndex + 1}`);
  const info = tribeConfig?.[dayKey]?.[gameKey] || {};
  return {
    available: Array.isArray(info.available) ? info.available.filter(Boolean) : [],
    unavailable: Array.isArray(info.unavailable) ? info.unavailable.filter(Boolean) : []
  };
}

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function renderTable(table, headers, rows, options = {}) {
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!headers.length) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = 'データがありません';
    tr.appendChild(th);
    thead.appendChild(tr);
    return;
  }

  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header.label;
    if (header.key === 'name') th.classList.add('align-left');
    if (isSummaryBoundaryKey(header.key)) th.classList.add('summary-boundary-right');
    if (isGame20Header(header)) th.classList.add('game20-header');
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = headers.length;
    td.className = 'empty-cell';
    td.textContent = 'データがありません';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (isFirst(row[options.winnerKey])) tr.classList.add('winner-row');

    headers.forEach(header => {
      const td = document.createElement('td');
      const value = row[header.key];
      td.textContent = format(value);
      td.className = getCellClass(table.id, header, value);
      if (isFirst(value)) td.classList.add('first-rank-cell');
      if (isSummaryBoundaryKey(header.key)) td.classList.add('summary-boundary-right');
      const highlightClass = getCellHighlightClass(table.id, header.key, value);
      if (highlightClass) td.classList.add(highlightClass);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function getCellClass(tableId, header, value) {
  const key = String(header?.key || '');
  const label = String(header?.label || '');
  const classes = [];

  if (key === 'name') {
    classes.push('name-cell');
    return classes.join(' ');
  }

  if (key === 'hero') classes.push('hero-cell');

  if (isRankKey(key, label)) classes.push('rank-cell');

  if (isNumericLike(value) || isNumberKey(key, label)) {
    classes.push('number-cell');
  } else {
    classes.push('text-cell');
  }

  if (key === 'dailyTotal' || key === 'leagueTotal' || key === 'total' || key === 'point') {
    classes.push('total-cell');
  }

  return classes.join(' ');
}

function isNumericLike(value) {
  return typeof value === 'number' || /^-?\d+(?:\.\d+)?$/.test(String(value || '').trim());
}

function isNumberKey(key, label) {
  const normalizedKey = String(key || '').toLowerCase();
  const normalizedLabel = String(label || '').toLowerCase();
  return /^game\d+$/.test(normalizedKey)
    || ['rank', 'placement', 'point', 'dailytotal', 'leaguetotal', 'total', 'firstcount', 'average', 'ptrank'].includes(normalizedKey)
    || /^(game|g)\s*\d+$/i.test(normalizedLabel)
    || ['順位', '最終順位', '平均', 'total', 'point'].includes(label);
}

function isRankKey(key, label) {
  const normalizedKey = String(key || '').toLowerCase();
  return ['rank', 'placement', 'ptrank', 'finalrank'].includes(normalizedKey)
    || ['順位', '最終順位', 'Placement'].includes(label);
}

function isSummaryBoundaryKey(key) {
  return ['ptRank', 'rank', 'game5', 'game10', 'game15', 'game20'].includes(String(key));
}

function isGame20Header(header) {
  return String(header?.key || '').toLowerCase() === 'game20' || String(header?.label || '').toLowerCase() === 'game20';
}

function getCellHighlightClass(tableId, columnKey, value) {
  const num = Number(value);
  const key = String(columnKey || '').toLowerCase();
  const isGameColumn = /^game\d+$/.test(key);

  if (!Number.isFinite(num) || !isGameColumn) return '';

  if (tableId === 'day-points-table') {
    const isGame20 = selectedDayIndex === 3 && key === 'game5';
    if (isGame20) {
      if (num === 21) return 'score-gold';
      if (num === 18) return 'score-silver';
      return '';
    }

    if (num === 7) return 'score-gold';
    if (num === 6) return 'score-silver';
  }

  if (tableId === 'day-placements-table') {
    if (num === 1) return 'score-gold';
    if (num === 2) return 'score-silver';
  }

  return '';
}

function renderError(error) {
  [elements.summaryTable, elements.dailyScoreTable, elements.dayPointsTable, elements.dayPlacementsTable, elements.gameDetailTable].forEach(table => {
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = `<tr><td class="empty-cell">エラー: ${esc(error.message || String(error))}</td></tr>`;
  });
}

function setStatus(text) {
  if (elements.dataStatus) elements.dataStatus.textContent = text;
}

function format(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return String(value);
}

function formatDateTime(value) {
  const date = new Date(value);
  return isNaN(date) ? String(value) : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function timeShort(game) {
  return game?.startTime && game?.endTime ? `${game.startTime}-${game.endTime}` : (game?.startTime || '');
}

function isFirst(value) {
  return String(value || '').trim().toLowerCase() === '1st' || Number(value) === 1;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
