const API_URL = '/api/results';

let loadedData = null;
let selectedDayIndex = 0;
let selectedGameIndex = 0;

const elements = {
  eventTitle: document.getElementById('event-title'),
  dataStatus: document.getElementById('data-status'),
  updatedAt: document.getElementById('updated-at'),
  summaryTable: document.getElementById('summary-table'),
  dayTabs: document.getElementById('day-tabs'),
  dayTitle: document.getElementById('day-title'),
  dailyScoreTable: document.getElementById('daily-score-table'),
  dayPointsTable: document.getElementById('day-points-table'),
  dayPlacementsTable: document.getElementById('day-placements-table'),
  gameTabs: document.getElementById('game-tabs'),
  gameTitle: document.getElementById('game-title'),
  gameStartTime: document.getElementById('game-start-time'),
  gameEndTime: document.getElementById('game-end-time'),
  gameBan: document.getElementById('game-ban'),
  gameAnomaly: document.getElementById('game-anomaly'),
  gameDetailTable: document.getElementById('game-detail-table')
};

init();

async function init() {
  startLoadingDots();
  try {
    setStatus('読み込み中...');
    const response = await fetch(API_URL, { cache: 'default' });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    loadedData = data;
    renderPage(data);
    setStatus('読み込み完了');
  } catch (error) {
    console.error(error);
    setStatus('読み込みに失敗しました');
    renderError(error);
  } finally {
    hideLoadingOverlay();
  }
}

function startLoadingDots() {
  const el = document.getElementById('ld-dots');
  if (!el) return;
  let i = 0;
  const frames = ['', '.', '..', '...'];
  window._ldTimer = setInterval(() => { el.textContent = frames[i++ % frames.length]; }, 400);
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  clearInterval(window._ldTimer);
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 500);
}

function renderPage(data) {
  if (data.title && elements.eventTitle) {
    elements.eventTitle.textContent = data.title;
    document.title = data.title;
  }
  if (elements.updatedAt && data.updatedAt) {
    elements.updatedAt.textContent = `更新: ${formatDateTime(data.updatedAt)}`;
  }
  renderSummary(data.summary);
  renderDayTabs(data.days || []);
  if (data.days && data.days.length > 0) renderSelectedDay(0);
}

function renderSummary(summary) { renderSummaryTable(summary); }

function renderSummaryTable(summary) {
  const table = elements.summaryTable;
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;
  thead.innerHTML = '';
  tbody.innerHTML = '';
  const groupHeaders = summary?.groupHeaders || [];
  const headers = summary?.headers || [];
  const rows = summary?.rows || [];
  if (groupHeaders.length > 0) {
    const groupRow = document.createElement('tr');
    groupRow.className = 'summary-group-row';
    groupHeaders.forEach(group => {
      const th = document.createElement('th');
      th.textContent = group.label;
      th.colSpan = group.span;
      th.className = 'summary-group-header';
      groupRow.appendChild(th);
    });
    thead.appendChild(groupRow);
  }
  if (headers.length === 0) {
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
    th.className = 'summary-header-cell';
    th.classList.add(header.key === 'name' ? 'align-left' : 'align-center');
    if (header.isGame20) th.classList.add('game20-header');
    if (isSummaryBoundaryKey(header.key)) th.classList.add('summary-boundary-right');
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  if (!rows || rows.length === 0) {
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
    if (String(row.ptRank).trim().toLowerCase() === '1st') tr.classList.add('winner-row');
    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = formatCellValue(row[header.key]);
      td.classList.add(header.key === 'name' ? 'name-cell' : 'align-center');
      if (header.key === 'name') td.classList.add('align-left');
      if (isSummaryBoundaryKey(header.key)) td.classList.add('summary-boundary-right');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function isSummaryBoundaryKey(key) { return ['ptRank', 'game5', 'game10', 'game15', 'game20'].includes(key); }

function renderDayTabs(days) {
  if (!elements.dayTabs) return;
  elements.dayTabs.innerHTML = '';
  days.forEach((day, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-tab';
    if (index === selectedDayIndex) button.classList.add('active');
    button.innerHTML = `<span class="tab-main">${escapeHtml(day.label || `DAY${index + 1}`)}</span><span class="tab-sub">${escapeHtml(day.date || '')}</span>`;
    button.addEventListener('click', () => renderSelectedDay(index));
    elements.dayTabs.appendChild(button);
  });
}

function renderSelectedDay(index) {
  if (!loadedData || !loadedData.days || !loadedData.days[index]) return;
  selectedDayIndex = index;
  selectedGameIndex = 0;
  const day = loadedData.days[index];
  updateActiveDayTab();
  if (elements.dayTitle) {
    const label = day.label || `DAY${index + 1}`;
    const date = day.date ? ` / ${day.date}` : '';
    elements.dayTitle.textContent = `${label}${date}`;
  }
  renderDailyScore(day);
  renderDayPoints(day);
  renderDayPlacements(day);
  renderGameTabs(day);
  renderSelectedGame(0);
}

function updateActiveDayTab() {
  if (!elements.dayTabs) return;
  elements.dayTabs.querySelectorAll('.day-tab').forEach((button, index) => button.classList.toggle('active', index === selectedDayIndex));
}

function renderDailyScore(day) {
  const columns = [
    { label: 'Name', key: 'name', className: 'name-cell' },
    { label: 'Point', key: 'point', className: 'number-cell total-cell' },
    { label: '順位', key: 'rank', className: 'rank-cell' }
  ];
  renderObjectTable(elements.dailyScoreTable, columns, day.dailyScore?.rows || [], { winnerByRank: true });
}

function renderDayPoints(day) {
  const games = day.games || [];
  const columns = [
    { label: 'Name', key: 'name', className: 'name-cell' },
    { label: 'Daily Total', key: 'dailyTotal', className: 'number-cell total-cell' },
    { label: '順位', key: 'rank', className: 'rank-cell' },
    ...games.map((game, index) => ({ label: `game${index + 1}`, key: game, className: 'number-cell game-cell' }))
  ];
  renderObjectTable(elements.dayPointsTable, columns, day.points?.rows || [], { winnerByRank: true });
}

function renderDayPlacements(day) {
  const games = day.games || [];
  const columns = [
    { label: 'Name', key: 'name', className: 'name-cell' },
    { label: '1st count', key: 'firstCount', className: 'number-cell' },
    { label: 'average', key: 'average', className: 'number-cell' },
    ...games.map((game, index) => ({ label: `game${index + 1}`, key: game, className: 'number-cell game-cell' }))
  ];
  renderObjectTable(elements.dayPlacementsTable, columns, day.placements?.rows || [], {});
}

function renderGameTabs(day) {
  if (!elements.gameTabs) return;
  elements.gameTabs.innerHTML = '';
  const gameDetails = day.gameDetails || [];
  gameDetails.forEach((game, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-tab';
    if (index === selectedGameIndex) button.classList.add('active');
    button.innerHTML = `<span class="tab-main">${escapeHtml(game.label || `GAME${index + 1}`)}</span><span class="tab-sub">${escapeHtml(formatGameTimeShort(game))}</span>`;
    button.addEventListener('click', () => renderSelectedGame(index));
    elements.gameTabs.appendChild(button);
  });
}

function renderSelectedGame(index) {
  if (!loadedData || !loadedData.days || !loadedData.days[selectedDayIndex]) return;
  const day = loadedData.days[selectedDayIndex];
  const gameDetails = day.gameDetails || [];
  selectedGameIndex = index;
  updateActiveGameTab();
  if (!gameDetails[index]) {
    renderGameMeta(null);
    renderGameDetailTable([]);
    return;
  }
  const game = gameDetails[index];
  renderGameMeta(game);
  renderGameDetailTable(game.rows || []);
}

function updateActiveGameTab() {
  if (!elements.gameTabs) return;
  elements.gameTabs.querySelectorAll('.game-tab').forEach((button, index) => button.classList.toggle('active', index === selectedGameIndex));
}

function renderGameMeta(game) {
  if (!game) {
    if (elements.gameTitle) elements.gameTitle.textContent = 'GAME';
    if (elements.gameStartTime) elements.gameStartTime.textContent = '開始: -';
    if (elements.gameEndTime) elements.gameEndTime.textContent = '終了: -';
    if (elements.gameBan) elements.gameBan.textContent = 'BAN: -';
    if (elements.gameAnomaly) elements.gameAnomaly.textContent = '異常: -';
    return;
  }
  if (elements.gameTitle) elements.gameTitle.textContent = game.label || 'GAME';
  if (elements.gameStartTime) elements.gameStartTime.textContent = `開始: ${game.startTime || '-'}`;
  if (elements.gameEndTime) elements.gameEndTime.textContent = `終了: ${game.endTime || '-'}`;
  if (elements.gameBan) {
    const banText = Array.isArray(game.ban) && game.ban.length > 0 ? game.ban.join(' / ') : '-';
    elements.gameBan.textContent = `BAN: ${banText}`;
  }
  if (elements.gameAnomaly) elements.gameAnomaly.textContent = `異常: ${game.anomaly || '-'}`;
}

function renderGameDetailTable(rows) {
  const columns = [
    { label: 'Name', key: 'name', className: 'name-cell' },
    { label: '順位', key: 'placement', className: 'number-cell rank-cell' },
    { label: 'HERO', key: 'hero', className: 'text-cell hero-cell' },
    { label: 'COMP', key: 'comp', className: 'text-cell wide-cell' },
    { label: 'Lesser 1', key: 'lesser1', className: 'text-cell wide-cell' },
    { label: 'Lesser 2', key: 'lesser2', className: 'text-cell wide-cell' },
    { label: 'Greater 1', key: 'greater1', className: 'text-cell wide-cell' },
    { label: 'Greater 2', key: 'greater2', className: 'text-cell wide-cell' },
    { label: 'Info', key: 'info', className: 'text-cell wide-cell' }
  ];
  renderObjectTable(elements.gameDetailTable, columns, rows || [], { winnerByPlacement: true });
}

function renderObjectTable(table, columns, rows, options = {}) {
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;
  thead.innerHTML = '';
  tbody.innerHTML = '';
  const headerRow = document.createElement('tr');
  columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column.label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  if (!rows || rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns.length;
    td.className = 'empty-cell';
    td.textContent = 'データがありません';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (options.winnerByRank && isFirstRank(row.rank)) tr.classList.add('winner-row');
    if (options.winnerByPlacement && Number(row.placement) === 1) tr.classList.add('winner-row');
    columns.forEach(column => {
      const td = document.createElement('td');
      td.className = column.className || '';
      const value = row[column.key];
      td.textContent = formatCellValue(value);
      if (isFirstRank(value) || (Number(value) === 1 && column.key === 'placement')) td.classList.add('first-rank-cell');
      const highlightClass = getCellHighlightClass(table.id, column.key, value);
      if (highlightClass) td.classList.add(highlightClass);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function getCellHighlightClass(tableId, columnKey, value) {
  const num = Number(value);
  const isGameColumn = /^game\d+$/.test(String(columnKey));

  if (!Number.isFinite(num) || !isGameColumn) return '';

  if (tableId === 'day-points-table') {
    const isGame20 = selectedDayIndex === 3 && String(columnKey) === 'game5';
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
  const message = error && error.message ? error.message : String(error);
  [elements.summaryTable, elements.dailyScoreTable, elements.dayPointsTable, elements.dayPlacementsTable, elements.gameDetailTable].forEach(table => {
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    thead.innerHTML = '';
    tbody.innerHTML = `<tr><td class="empty-cell">エラー: ${escapeHtml(message)}</td></tr>`;
  });
}

function setStatus(text) { if (elements.dataStatus) elements.dataStatus.textContent = text; }
function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return String(value);
}
function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}
function formatGameTimeShort(game) {
  if (!game) return '';
  if (game.startTime && game.endTime) return `${game.startTime}-${game.endTime}`;
  if (game.startTime) return game.startTime;
  return '';
}
function isFirstRank(value) { return String(value).trim().toLowerCase() === '1st'; }
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
