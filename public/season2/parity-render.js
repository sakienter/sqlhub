function renderPage(data, keepSelection = false) {
  if (data.title && elements.eventTitle) {
    elements.eventTitle.textContent = data.title;
    document.title = data.title;
  }

  renderSummary(data.summary);
  const days = data.days || [];
  selectedDayIndex = keepSelection ? Math.min(selectedDayIndex, days.length - 1) : 0;
  selectedGameIndex = keepSelection ? selectedGameIndex : 0;
  renderDayTabs(days);
  renderSelectedDay(Math.max(selectedDayIndex, 0), keepSelection);
}

function renderSummary(summary) {
  const headers = summary?.headers || SUMMARY_HEADERS;
  renderTable(elements.summaryTable, headers, summary?.rows || [], {
    rankKey: findRankKey(headers),
    finalRank: true
  });
}

function renderDayTabs(days) {
  if (!elements.dayTabs) return;
  elements.dayTabs.innerHTML = '';
  days.forEach((day, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `day-tab${index === selectedDayIndex ? ' active' : ''}`;
    button.innerHTML = `<span class="tab-main">${esc(day.label || `DAY${index + 1}`)}</span><span class="tab-sub">${esc(day.date || '')}</span>`;
    button.addEventListener('click', () => renderSelectedDay(index, false));
    elements.dayTabs.appendChild(button);
  });
}

function renderSelectedDay(index, keepGame) {
  const day = loadedData?.days?.[index];
  if (!day) return;

  selectedDayIndex = index;
  selectedGameIndex = keepGame
    ? Math.min(selectedGameIndex, Math.max((day.gameDetails || []).length - 1, 0))
    : 0;

  setActive(elements.dayTabs, '.day-tab', index);
  if (elements.dayTitle) {
    elements.dayTitle.textContent = `${day.label || `DAY${index + 1}`}${day.date ? ` / ${day.date}` : ''}`;
  }

  renderTable(elements.dayPointsTable, day.points?.headers || DAY_POINTS_HEADERS, day.points?.rows || [], { rankKey: 'rank' });
  renderTable(elements.dayPlacementsTable, day.placements?.headers || DAY_PLACEMENT_HEADERS, day.placements?.rows || [], {});
  renderGameTabs(day);
  renderSelectedGame(selectedGameIndex);
}

function renderGameTabs(day) {
  if (!elements.gameTabs) return;
  elements.gameTabs.innerHTML = '';
  (day.gameDetails || []).forEach((game, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-tab${index === selectedGameIndex ? ' active' : ''}`;
    button.innerHTML = `<span class="tab-main">${esc(game.label || `GAME${index + 1}`)}</span><span class="tab-sub">${esc(shortTime(game))}</span>`;
    button.addEventListener('click', () => renderSelectedGame(index));
    elements.gameTabs.appendChild(button);
  });
}

function renderSelectedGame(index) {
  const day = loadedData?.days?.[selectedDayIndex];
  const game = day?.gameDetails?.[index];
  selectedGameIndex = index;
  setActive(elements.gameTabs, '.game-tab', index);
  renderGameMeta(game);
  renderTable(elements.gameDetailTable, game?.headers || GAME_DETAIL_HEADERS, game?.rows || [], { rankKey: 'placement' });
}

function setActive(parent, selector, index) {
  if (!parent) return;
  parent.querySelectorAll(selector).forEach((button, current) => {
    button.classList.toggle('active', current === index);
  });
}

function renderGameMeta(game) {
  if (elements.gameTitle) elements.gameTitle.textContent = game?.label || 'GAME';
  if (elements.gameStartTime) elements.gameStartTime.textContent = `開始: ${game?.startTime || '未実施'}`;
  if (elements.gameEndTime) elements.gameEndTime.textContent = `終了: ${game?.endTime || '未実施'}`;
  if (elements.gameAnomaly) elements.gameAnomaly.textContent = `異常: ${game?.anomaly || '未実施'}`;
  if (elements.gameBan) elements.gameBan.innerHTML = renderTribes(game);
}

function renderTribes(game) {
  const day = loadedData?.days?.[selectedDayIndex];
  const dayKey = normalizeKey(day?.label || `DAY${selectedDayIndex + 1}`);
  const gameKey = normalizeKey(game?.label || `GAME${selectedGameIndex + 1}`);
  const info = tribeConfig?.[dayKey]?.[gameKey] || {};
  const available = new Set(Array.isArray(info.available) ? info.available : []);
  const unavailable = new Set(Array.isArray(info.unavailable) ? info.unavailable : []);
  const empty = available.size === 0 && unavailable.size === 0;

  const items = S2_TRIBES.map(tribe => {
    const state = available.has(tribe.name)
      ? 'is-available'
      : unavailable.has(tribe.name)
        ? 'is-unavailable'
        : 'is-unknown';
    const src = `${S2_TRIBE_ICON_BASE}/${tribe.file}`;
    return `<span class="tribe-item ${state} tribe-${tribe.className}"><span class="tribe-icon"><img src="${esc(src)}" alt="" loading="lazy"></span><span class="tribe-name">${esc(tribe.label)}</span></span>`;
  }).join('');

  return `<span class="tribe-panel"><span class="tribe-panel-title">Minion Types${empty ? '<span class="tribe-status">未実施</span>' : ''}</span><span class="tribe-grid">${items}</span></span>`;
}

function renderTable(table, headers, rows, options) {
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  const list = normalizeHeaders(headers, []);
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');
  list.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header.label;
    if (header.key === 'name') th.classList.add('align-left');
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  setEmptyState(table, rows.length === 0);
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    if (isFirst(row?.[options.rankKey])) tr.classList.add('winner-row');

    list.forEach(header => {
      const td = document.createElement('td');
      const value = row?.[header.key];
      td.className = cellClass(header, value);

      if (options.finalRank && isRankHeader(header)) {
        td.classList.add('final-rank-cell');
        td.innerHTML = rankLabel(value, rowIndex + 1);
      } else {
        td.textContent = formatValue(value);
      }

      const highlight = highlightClass(table.id, header.key, value);
      if (highlight) td.classList.add(highlight);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function setEmptyState(table, empty) {
  const wrapper = table.closest('.table-wrap');
  if (!wrapper) return;
  let state = wrapper.querySelector('.table-empty-state');
  if (!state) {
    state = document.createElement('div');
    state.className = 'table-empty-state';
    state.textContent = '未実施';
    wrapper.appendChild(state);
  }
  state.hidden = !empty;
}

function rankLabel(value, fallback) {
  const rank = Number(String(value ?? '').match(/\d+/)?.[0]) || fallback;
  const label = String(value || ordinal(rank));
  if (rank <= 3) return `<span class="final-rank-chip rank-${rank}"><span class="final-rank-label">${esc(label)}</span></span>`;
  return `<span class="final-rank-simple">${esc(label)}</span>`;
}

function ordinal(rank) {
  return rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
}

function findRankKey(headers) {
  return normalizeHeaders(headers, []).find(isRankHeader)?.key || 'rank';
}

function isRankHeader(header) {
  const key = String(header?.key || '').toLowerCase();
  const label = String(header?.label || '').toLowerCase();
  return ['rank', 'placement', 'ptrank', 'finalrank'].includes(key)
    || ['順位', '最終順位', 'placement'].includes(label);
}

function cellClass(header, value) {
  const key = String(header?.key || '');
  const label = String(header?.label || '');
  if (key === 'name') return 'name-cell';
  const classes = [];
  if (key === 'hero') classes.push('hero-cell');
  if (isRankHeader(header)) classes.push('rank-cell');
  const numericKey = /^(game|day)\d+$/i.test(key)
    || ['rank', 'placement', 'point', 'dailyTotal', 'total', 'firstCount', 'average'].includes(key)
    || ['順位', '最終順位', '平均', 'Total', 'Point'].includes(label);
  classes.push(typeof value === 'number' || numericKey ? 'number-cell' : 'text-cell');
  if (['dailyTotal', 'total', 'point'].includes(key)) classes.push('total-cell');
  return classes.join(' ');
}

function highlightClass(tableId, key, value) {
  const number = Number(value);
  const gameKey = String(key || '').toLowerCase();
  if (!Number.isFinite(number) || !/^game\d+$/.test(gameKey)) return '';
  if (tableId === 'day-points-table') {
    if (selectedDayIndex === 3 && gameKey === 'game5') return number === 21 ? 'score-gold' : number === 18 ? 'score-silver' : '';
    return number === 7 ? 'score-gold' : number === 6 ? 'score-silver' : '';
  }
  if (tableId === 'day-placements-table') return number === 1 ? 'score-gold' : number === 2 ? 'score-silver' : '';
  return '';
}

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function shortTime(game) {
  if (game?.startTime && game?.endTime) return `${game.startTime}-${game.endTime}`;
  return game?.startTime || '未実施';
}

function isFirst(value) {
  return String(value || '').trim().toLowerCase() === '1st' || Number(value) === 1;
}

function formatValue(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return String(value);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}
