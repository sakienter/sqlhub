const API_URL = '/api/season2/results';
const TRIBES = ['アンデッド', 'エレメンタル', 'ドラゴン', 'キルボア', 'ナーガ', 'マーロック', 'メカ', '悪魔', '海賊', '獣'];
const STORAGE_KEY = 'season2TribeConfig';

let loadedData = null;
let selectedDayIndex = 0;
let selectedGameIndex = 0;
let tribeDraft = loadTribeConfig();

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
  gameDetailTable: $('game-detail-table'),
  tribeButtons: $('tribe-buttons'),
  tribeSaveButton: $('tribe-save-button'),
  tribeSaveStatus: $('tribe-save-status')
};

init();

async function init() {
  startLoadingDots();
  bindTribeEditor();

  try {
    setStatus('読み込み中...');
    const r = await fetch(API_URL, { cache: 'default' });
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    const data = await r.json();
    loadedData = data;
    renderPage(data);
    setStatus('読み込み完了');
  } catch (e) {
    console.error(e);
    setStatus('読み込みに失敗しました');
    renderError(e);
  } finally {
    hideLoadingOverlay();
  }
}

function startLoadingDots() {
  const el = $('ld-dots');
  if (!el) return;
  let i = 0;
  const frames = ['', '.', '..', '...'];
  window._ldTimer = setInterval(() => el.textContent = frames[i++ % frames.length], 400);
}

function hideLoadingOverlay() {
  const o = $('loading-overlay');
  if (!o) return;
  clearInterval(window._ldTimer);
  o.classList.add('hidden');
  setTimeout(() => o.remove(), 500);
}

function renderPage(data) {
  if (data.title && elements.eventTitle) {
    elements.eventTitle.textContent = data.title;
    document.title = data.title;
  }
  if (data.updatedAt && elements.updatedAt) elements.updatedAt.textContent = '更新: ' + formatDateTime(data.updatedAt);

  renderSummary(data.summary || {});
  renderDayTabs(data.days || []);
  if (data.days?.length) renderSelectedDay(0);
}

function renderSummary(summary) {
  renderTable(elements.summaryTable, summary.headers || [], summary.rows || [], { winnerKey: 'rank' });
}

function renderDayTabs(days) {
  if (!elements.dayTabs) return;
  elements.dayTabs.innerHTML = '';

  days.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day-tab' + (i === selectedDayIndex ? ' active' : '');
    b.innerHTML = `<span class="tab-main">${esc(d.label || `DAY${i + 1}`)}</span><span class="tab-sub">${esc(d.date || '')}</span>`;
    b.onclick = () => renderSelectedDay(i);
    elements.dayTabs.appendChild(b);
  });
}

function renderSelectedDay(i) {
  const day = loadedData?.days?.[i];
  if (!day) return;

  selectedDayIndex = i;
  selectedGameIndex = 0;
  updateActive(elements.dayTabs, '.day-tab', i);

  if (elements.dayTitle) elements.dayTitle.textContent = (day.label || `DAY${i + 1}`) + (day.date ? ` / ${day.date}` : '');

  renderTable(elements.dailyScoreTable, day.dailyScore?.headers || [], day.dailyScore?.rows || [], { winnerKey: 'rank' });
  renderTable(elements.dayPointsTable, day.points?.headers || [], day.points?.rows || [], { winnerKey: 'rank' });
  renderTable(elements.dayPlacementsTable, day.placements?.headers || [], day.placements?.rows || [], {});
  renderGameTabs(day);
  renderSelectedGame(0);
}

function renderGameTabs(day) {
  if (!elements.gameTabs) return;
  elements.gameTabs.innerHTML = '';

  (day.gameDetails || []).forEach((g, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game-tab' + (i === selectedGameIndex ? ' active' : '');
    b.innerHTML = `<span class="tab-main">${esc(g.label || `GAME${i + 1}`)}</span><span class="tab-sub">${esc(timeShort(g))}</span>`;
    b.onclick = () => renderSelectedGame(i);
    elements.gameTabs.appendChild(b);
  });
}

function renderSelectedGame(i) {
  const day = loadedData?.days?.[selectedDayIndex];
  const game = day?.gameDetails?.[i];
  selectedGameIndex = i;
  updateActive(elements.gameTabs, '.game-tab', i);

  if (!game) {
    renderGameMeta(null);
    renderTable(elements.gameDetailTable, [], [], {});
    renderTribeEditor();
    return;
  }

  renderGameMeta(game);
  renderTribeEditor();
  renderTable(elements.gameDetailTable, game.headers || [], game.rows || [], { winnerKey: 'placement' });
}

function updateActive(parent, selector, index) {
  if (!parent) return;
  parent.querySelectorAll(selector).forEach((b, i) => b.classList.toggle('active', i === index));
}

function renderGameMeta(g) {
  if (elements.gameTitle) elements.gameTitle.textContent = g?.label || 'GAME';
  if (elements.gameStartTime) elements.gameStartTime.textContent = '開始: ' + (g?.startTime || '-');
  if (elements.gameEndTime) elements.gameEndTime.textContent = '終了: ' + (g?.endTime || '-');
  if (elements.gameBan) elements.gameBan.innerHTML = renderTribeInfo(g);
  if (elements.gameAnomaly) elements.gameAnomaly.textContent = '異常: ' + (g?.anomaly || '-');
}

function renderTribeInfo(g) {
  const info = getManualTribeInfo(g);
  const available = info.available.length ? info.available.join(', ') : '-';
  const unavailable = info.unavailable.length ? info.unavailable.join(', ') : '-';
  return `BAN）登場種族：${esc(available)}<br><span class="ban-subline">非登場種族：${esc(unavailable)}</span>`;
}

function getManualTribeInfo(g) {
  const key = getCurrentConfigKey(g);
  const info = getTribeConfigByKey(key);
  return {
    available: Array.isArray(info.available) ? info.available.filter(Boolean) : [],
    unavailable: Array.isArray(info.unavailable) ? info.unavailable.filter(Boolean) : []
  };
}

function bindTribeEditor() {
  if (!elements.tribeSaveButton) return;
  elements.tribeSaveButton.addEventListener('click', () => {
    saveTribeConfig();
    if (elements.tribeSaveStatus) {
      elements.tribeSaveStatus.textContent = '保存しました。';
      setTimeout(() => elements.tribeSaveStatus.textContent = '', 1800);
    }
  });
}

function renderTribeEditor() {
  if (!elements.tribeButtons) return;
  const game = loadedData?.days?.[selectedDayIndex]?.gameDetails?.[selectedGameIndex];
  const key = getCurrentConfigKey(game);
  const info = getTribeConfigByKey(key);
  const availableSet = new Set(info.available || []);

  elements.tribeButtons.innerHTML = '';
  TRIBES.forEach(tribe => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tribe-toggle ' + (availableSet.has(tribe) ? 'is-available' : 'is-unavailable');
    button.textContent = tribe;
    button.onclick = () => {
      toggleTribe(key, tribe);
      renderGameMeta(game);
      renderTribeEditor();
    };
    elements.tribeButtons.appendChild(button);
  });
}

function toggleTribe(key, tribe) {
  const info = getTribeConfigByKey(key);
  const available = new Set(info.available || []);

  if (available.has(tribe)) available.delete(tribe);
  else available.add(tribe);

  const availableList = TRIBES.filter(t => available.has(t));
  const unavailableList = TRIBES.filter(t => !available.has(t));
  setTribeConfigByKey(key, { available: availableList, unavailable: unavailableList });
}

function getCurrentConfigKey(g) {
  const day = loadedData?.days?.[selectedDayIndex];
  const dayKey = normalizeGameKey(day?.label || `DAY${selectedDayIndex + 1}`);
  const gameKey = normalizeGameKey(g?.label || `GAME${selectedGameIndex + 1}`);
  return { dayKey, gameKey };
}

function getTribeConfigByKey({ dayKey, gameKey }) {
  if (!tribeDraft[dayKey]) tribeDraft[dayKey] = {};
  if (!tribeDraft[dayKey][gameKey]) tribeDraft[dayKey][gameKey] = buildDefaultTribeInfo();
  return tribeDraft[dayKey][gameKey];
}

function setTribeConfigByKey({ dayKey, gameKey }, info) {
  if (!tribeDraft[dayKey]) tribeDraft[dayKey] = {};
  tribeDraft[dayKey][gameKey] = info;
}

function buildDefaultTribeInfo() {
  return {
    available: [],
    unavailable: [...TRIBES]
  };
}

function loadTribeConfig() {
  const base = structuredCloneSafe(window.SEASON2_TRIBE_CONFIG || {});
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return mergeDeep(base, saved);
  } catch (_) {
    return base;
  }
}

function saveTribeConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tribeDraft));
}

function mergeDeep(base, extra) {
  const result = structuredCloneSafe(base);
  Object.keys(extra || {}).forEach(dayKey => {
    if (!result[dayKey]) result[dayKey] = {};
    Object.keys(extra[dayKey] || {}).forEach(gameKey => {
      result[dayKey][gameKey] = extra[dayKey][gameKey];
    });
  });
  return result;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeGameKey(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function renderTable(table, headers, rows, opt = {}) {
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!headers.length) {
    thead.innerHTML = '<tr><th>データがありません</th></tr>';
    return;
  }

  const hr = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td class="empty-cell" colspan="${headers.length}">データがありません</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (isFirst(row[opt.winnerKey])) tr.classList.add('winner-row');

    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = format(row[h.key]);
      if (h.key === 'name') td.className = 'name-cell';
      else if (typeof row[h.key] === 'number' || ['rank', 'placement', 'point', 'dailyTotal', 'leagueTotal', 'firstCount', 'average'].includes(h.key)) td.className = 'number-cell';
      else td.className = 'text-cell';
      if (isFirst(row[h.key])) td.classList.add('first-rank-cell');
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function renderError(e) {
  [elements.summaryTable, elements.dailyScoreTable, elements.dayPointsTable, elements.dayPlacementsTable, elements.gameDetailTable].forEach(t => {
    if (!t) return;
    const tb = t.querySelector('tbody');
    const th = t.querySelector('thead');
    if (th) th.innerHTML = '';
    if (tb) tb.innerHTML = `<tr><td class="empty-cell">エラー: ${esc(e.message || String(e))}</td></tr>`;
  });
}

function setStatus(t) {
  if (elements.dataStatus) elements.dataStatus.textContent = t;
}

function format(v) {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  return String(v);
}

function formatDateTime(v) {
  const d = new Date(v);
  return isNaN(d) ? String(v) : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
}

function timeShort(g) {
  return g?.startTime && g?.endTime ? `${g.startTime}-${g.endTime}` : (g?.startTime || '');
}

function isFirst(v) {
  return String(v || '').trim().toLowerCase() === '1st' || Number(v) === 1;
}

function esc(v) {
  return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
