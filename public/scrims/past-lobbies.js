const PAST_LOBBIES_API_URL = '/api/scrims/past-lobbies';
const PAST_LOBBIES_FALLBACK_URL = './past-lobbies.json';
const SCRIM_REGISTRATION_API_URL = '/api/scrims/registrations';
const LEGACY_GAS_URL = 'https://script.google.com/macros/s/AKfycbwAOzVDHW00L_jhQIRev1_MP5trFFMizYuCToeu8LsOWuX6hd530jjrLEFQ94Mi78L1QQ/exec';

function installD1RegistrationBridge() {
  if (!document.querySelector('#scrimEntryForm')) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (resource, init = {}) => {
    const requestUrl = typeof resource === 'string' ? resource : resource?.url;
    if (requestUrl !== LEGACY_GAS_URL) {
      return nativeFetch(resource, init);
    }

    let legacyPayload = {};
    try {
      legacyPayload = JSON.parse(String(init.body || '{}'));
    } catch {
      legacyPayload = {};
    }

    let response;
    try {
      response = await nativeFetch(SCRIM_REGISTRATION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: legacyPayload.eventId,
          battleTag: legacyPayload.btag,
          xAccount: legacyPayload.twitter,
          website: ''
        }),
        cache: 'no-store'
      });
    } catch (error) {
      console.error('D1への参加申請送信に失敗しました。', error);
      throw error;
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const message = data.error || `送信に失敗しました。（HTTP ${response.status}）`;
      window.setTimeout(() => {
        const errorElement = document.querySelector('#scrimEntryError');
        if (!errorElement) return;
        errorElement.textContent = message;
        errorElement.style.display = 'block';
      }, 0);
      throw new Error(message);
    }

    if (data.applicationCode) {
      window.setTimeout(() => {
        const detail = document.querySelector('#scrimEntrySuccessDetail');
        if (!detail || detail.querySelector('[data-application-code]')) return;

        const line = document.createElement('div');
        line.dataset.applicationCode = 'true';

        const strong = document.createElement('strong');
        strong.textContent = '申請番号：';

        line.append(strong, document.createTextNode(data.applicationCode));
        detail.appendChild(line);
      }, 0);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  };
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
  script.src = '/tournament-share.js?v=20260614-scrim';
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
  const card = document.createElement('a');
  card.className = 'lobby-card';
  card.href = lobby.spreadsheetUrl;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.setAttribute('aria-label', `${formattedDate}の結果をスプレッドシートで確認`);

  const title = document.createElement('h3');
  title.textContent = formattedDate;

  const linkLabel = document.createElement('span');
  linkLabel.className = 'lobby-result-link';
  linkLabel.textContent = '結果を確認 →';

  const note = document.createElement('p');
  note.className = 'lobby-result-note';
  note.textContent = '（スプレッドシートが開きます）';

  card.append(title, linkLabel, note);
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

    const fallbackResponse = await fetch(`${PAST_LOBBIES_FALLBACK_URL}?v=20260613`, {
      cache: 'no-store'
    });
    if (!fallbackResponse.ok) {
      throw new Error(`Fallback HTTP ${fallbackResponse.status}`);
    }
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

installD1RegistrationBridge();
loadScrimShareControls();
renderPastLobbies();
