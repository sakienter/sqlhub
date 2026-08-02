const PAST_LOBBIES_API_URL = '/api/scrims/past-lobbies';
const PAST_LOBBIES_FALLBACK_URL = './past-lobbies.json';

function loadParticipationSpacing() {
  const style = document.createElement('style');
  style.textContent = `
    .participation-copy {
      line-height: 1.65 !important;
    }

    .participation-copy + .participation-copy {
      margin-top: 12px !important;
    }

    .participation-x-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin: 0 0 12px;
    }

    .participation-x-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 14px;
      color: #fff;
      background: #111827;
      border: 1px solid rgba(17, 24, 39, .18);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 850;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
      box-shadow: 0 5px 12px rgba(3, 14, 24, .16);
      transition: background .18s ease, border-color .18s ease, transform .18s ease;
    }

    .participation-x-link:hover {
      background: #020617;
      border-color: #020617;
      transform: translateY(-1px);
    }

    .participation-x-link:focus-visible {
      outline: 3px solid rgba(17, 24, 39, .24);
      outline-offset: 2px;
    }

    @media (max-width: 640px) {
      .participation-x-row {
        margin-bottom: 10px;
      }

      .participation-x-link {
        min-height: 34px;
        padding: 0 12px;
        font-size: 11px;
      }
    }
  `;
  document.head.appendChild(style);

  const participationTitle = [...document.querySelectorAll('.section-title')]
    .find((element) => element.textContent.trim() === '参加について');
  const participationBody = participationTitle?.nextElementSibling;

  if (participationBody && !participationBody.querySelector('.participation-x-link')) {
    const row = document.createElement('div');
    row.className = 'participation-x-row';

    const link = document.createElement('a');
    link.className = 'participation-x-link';
    link.href = 'https://x.com/stuntdrakebg';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'StuntdrakeのXを確認する ↗';
    link.setAttribute('aria-label', 'StuntdrakeのXを新しいタブで確認する');

    row.appendChild(link);
    participationBody.prepend(row);
  }
}

function loadRegistrationApp() {
  if (!document.querySelector('.scrim-entry-shell')) return;

  if (!document.querySelector('link[href*="registration-app.css"]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/scrims/registration-app.css?v=20260728';
    document.head.appendChild(style);
  }

  if (!document.querySelector('script[src*="registration-app.js"]')) {
    const script = document.createElement('script');
    script.src = '/scrims/registration-app.js?v=20260802-remove-note';
    script.defer = true;
    document.body.appendChild(script);
  }
}

function loadScrimShareControls() {
  if (document.querySelector('script[src*="/tournament-share.js"]')) return;

  const style = document.createElement('style');
  style.textContent = `
    .scrim-hero .tournament-share-strip--top {
      top: 2rem !important;
      right: calc(2rem + 48px) !important;
    }

    @media (max-width: 640px) {
      .scrim-hero .tournament-share-strip--top {
        top: 1.35rem !important;
        right: calc(1.35rem + 42px) !important;
      }
    }
  `;
  document.head.appendChild(style);

  const script = document.createElement('script');
  script.src = '/tournament-share.js?v=20260728';
  script.defer = true;
  document.body.appendChild(script);
}

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
    return (
      url.protocol === 'https:' &&
      url.hostname === 'docs.google.com' &&
      url.pathname.startsWith('/spreadsheets/')
    );
  } catch {
    return false;
  }
}

function createLobbyCard(lobby) {
  const formattedDate = formatLobbyDate(lobby.date);
  const lobbyName = typeof lobby.name === 'string' ? lobby.name.trim() : '';
  const accessibleTitle = lobbyName || 'スクリム';
  const card = document.createElement('a');
  card.className = 'lobby-card';
  card.href = lobby.spreadsheetUrl;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.setAttribute('aria-label', `${accessibleTitle}（${formattedDate}）の結果をスプレッドシートで確認`);

  const title = document.createElement('h3');
  title.textContent = accessibleTitle;

  const date = document.createElement('p');
  date.className = 'lobby-date';
  date.textContent = formattedDate;

  const linkLabel = document.createElement('span');
  linkLabel.className = 'lobby-result-link';
  linkLabel.textContent = '結果を確認 →';

  const note = document.createElement('p');
  note.className = 'lobby-result-note';
  note.textContent = '（スプレッドシートが開きます）';

  card.append(title);
  card.append(date, linkLabel, note);
  return card;
}

function renderEmptyState(container, message) {
  container.innerHTML = '';
  const empty = document.createElement('p');
  empty.className = 'lobby-empty';
  empty.textContent = message;
  container.appendChild(empty);
}

async function fetchLobbyData() {
  try {
    const response = await fetch(PAST_LOBBIES_API_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API HTTP ${response.status}`);
    return await response.json();
  } catch (apiError) {
    console.warn('Past Lobby APIを利用できないため、静的データを読み込みます。', apiError);

    const fallbackResponse = await fetch(`${PAST_LOBBIES_FALLBACK_URL}?v=20260728`, {
      cache: 'no-store'
    });
    if (!fallbackResponse.ok) throw new Error(`Fallback HTTP ${fallbackResponse.status}`);
    return await fallbackResponse.json();
  }
}

async function renderPastLobbies() {
  const container = document.querySelector('[data-past-lobbies]');
  if (!container) return;

  try {
    const data = await fetchLobbyData();
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

loadParticipationSpacing();
loadRegistrationApp();
loadScrimShareControls();
renderPastLobbies();
