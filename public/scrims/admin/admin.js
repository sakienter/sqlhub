const API_URL = '/api/scrims/past-lobbies';
const TOKEN_STORAGE_KEY = 'scrim-admin-token';

const form = document.querySelector('[data-admin-form]');
const tokenInput = document.querySelector('#admin-token');
const dateInput = document.querySelector('#lobby-date');
const urlInput = document.querySelector('#spreadsheet-url');
const submitButton = form?.querySelector('button[type="submit"]');
const statusElement = document.querySelector('[data-admin-status]');
const listElement = document.querySelector('[data-admin-list]');
const refreshButton = document.querySelector('[data-refresh]');

function setDefaultDate() {
  if (!dateInput || dateInput.value) return;
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  dateInput.value = localDate.toISOString().slice(0, 10);
}

function restoreToken() {
  if (!tokenInput) return;
  tokenInput.value = sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

function saveToken() {
  if (!tokenInput) return;
  const token = tokenInput.value.trim();

  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function setStatus(message, type = '') {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.className = `admin-status${type ? ` is-${type}` : ''}`;
}

function formatDate(value) {
  if (typeof value !== 'string') return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : value;
}

function getAdminToken() {
  return tokenInput?.value.trim() || '';
}

function isGoogleSpreadsheetUrl(value) {
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

async function apiRequest(method, body) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (method !== 'GET') {
    const token = getAdminToken();
    if (!token) {
      throw new Error('管理用パスワードを入力してください。');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `処理に失敗しました。（HTTP ${response.status}）`);
  }

  return data;
}

function renderEmpty(message) {
  if (!listElement) return;
  listElement.innerHTML = '';

  const empty = document.createElement('p');
  empty.className = 'admin-list-empty';
  empty.textContent = message;
  listElement.appendChild(empty);
}

function createLobbyRow(lobby) {
  const row = document.createElement('article');
  row.className = 'admin-lobby-row';

  const date = document.createElement('span');
  date.className = 'admin-lobby-date';
  date.textContent = formatDate(lobby.date);

  const link = document.createElement('a');
  link.className = 'admin-lobby-link';
  link.href = lobby.spreadsheetUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = lobby.spreadsheetUrl;

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-button';
  deleteButton.type = 'button';
  deleteButton.textContent = '削除';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`${formatDate(lobby.date)} のPast Lobbyを削除しますか？`)) return;

    deleteButton.disabled = true;
    setStatus('削除しています。');

    try {
      const data = await apiRequest('DELETE', { id: lobby.id });
      saveToken();
      renderLobbies(data.lobbies);
      setStatus('Past Lobbyを削除しました。', 'success');
    } catch (error) {
      deleteButton.disabled = false;
      setStatus(error.message, 'error');
      if (!getAdminToken()) tokenInput?.focus();
    }
  });

  row.append(date, link, deleteButton);
  return row;
}

function renderLobbies(lobbies) {
  if (!listElement) return;
  const items = Array.isArray(lobbies) ? lobbies : [];

  if (items.length === 0) {
    renderEmpty('登録済みのPast Lobbyはありません。');
    return;
  }

  listElement.innerHTML = '';
  items.forEach((lobby) => listElement.appendChild(createLobbyRow(lobby)));
}

async function loadLobbies() {
  renderEmpty('読み込んでいます。');

  try {
    const data = await apiRequest('GET');
    renderLobbies(data.lobbies);
  } catch (error) {
    renderEmpty('登録済みロビーを読み込めませんでした。');
    setStatus(error.message, 'error');
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const date = dateInput?.value || '';
  const spreadsheetUrl = urlInput?.value.trim() || '';

  if (!getAdminToken()) {
    setStatus('管理用パスワードを入力してください。', 'error');
    tokenInput?.focus();
    return;
  }

  if (!date) {
    setStatus('開催日を入力してください。', 'error');
    dateInput?.focus();
    return;
  }

  if (!isGoogleSpreadsheetUrl(spreadsheetUrl)) {
    setStatus('GoogleスプレッドシートのURLを入力してください。', 'error');
    urlInput?.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus('追加しています。');

  try {
    const data = await apiRequest('POST', { date, spreadsheetUrl });
    saveToken();
    renderLobbies(data.lobbies);
    urlInput.value = '';
    setStatus('Past Lobbyへ追加しました。', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

tokenInput?.addEventListener('change', saveToken);
refreshButton?.addEventListener('click', loadLobbies);

restoreToken();
setDefaultDate();
loadLobbies();
