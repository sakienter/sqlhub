const PAST_LOBBIES_URL = './past-lobbies.json';

function parseLobbyDate(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLobbyDate(value) {
  const date = parseLobbyDate(value);
  if (!date) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function isAllowedSpreadsheetUrl(value) {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function createLobbyCard(lobby) {
  const card = document.createElement('article');
  card.className = 'lobby-card';

  const title = document.createElement('h3');
  title.textContent = formatLobbyDate(lobby.date);

  const link = document.createElement('a');
  link.className = 'lobby-result-link';
  link.href = lobby.spreadsheetUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = '結果を確認 →';

  const note = document.createElement('p');
  note.className = 'lobby-result-note';
  note.textContent = '（スプレッドシートが開きます）';

  card.append(title, link, note);
  return card;
}

function renderEmptyState(container, message) {
  container.innerHTML = '';

  const empty = document.createElement('p');
  empty.className = 'lobby-empty';
  empty.textContent = message;
  container.appendChild(empty);
}

async function renderPastLobbies() {
  const container = document.querySelector('[data-past-lobbies]');
  if (!container) return;

  try {
    const response = await fetch(`${PAST_LOBBIES_URL}?v=20260613`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const lobbies = Array.isArray(data.lobbies) ? data.lobbies : [];

    const validLobbies = lobbies
      .filter((lobby) => lobby && parseLobbyDate(lobby.date) && isAllowedSpreadsheetUrl(lobby.spreadsheetUrl))
      .sort((a, b) => parseLobbyDate(b.date) - parseLobbyDate(a.date));

    if (validLobbies.length === 0) {
      renderEmptyState(container, '過去のロビーはまだありません。');
      return;
    }

    container.innerHTML = '';
    validLobbies.forEach((lobby) => container.appendChild(createLobbyCard(lobby)));
  } catch (error) {
    console.error('Past Lobbyの読み込みに失敗しました。', error);
    renderEmptyState(container, 'Past Lobbyを読み込めませんでした。');
  }
}

renderPastLobbies();
