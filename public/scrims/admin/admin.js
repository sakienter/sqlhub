const PAST_LOBBIES_API_URL = '/api/scrims/past-lobbies';
const REGISTRATIONS_API_URL = '/api/scrims/registrations';
const TOKEN_STORAGE_KEY = 'scrim-admin-token';

const STATUS_LABELS = Object.freeze({
  pending: '申請中',
  accepted: '参加確定',
  waitlisted: '補欠',
  cancelled: '辞退',
  rejected: '却下'
});

const tokenInput = document.querySelector('#admin-token');
const authButton = document.querySelector('[data-auth-load]');
const authStatus = document.querySelector('[data-auth-status]');

const registrationEventFilter = document.querySelector('#registration-event-filter');
const registrationStatusFilter = document.querySelector('#registration-status-filter');
const registrationRefreshButton = document.querySelector('[data-registration-refresh]');
const registrationStatus = document.querySelector('[data-registration-status]');
const registrationCounts = document.querySelector('[data-registration-counts]');
const registrationList = document.querySelector('[data-registration-list]');

const lobbyForm = document.querySelector('[data-lobby-form]');
const dateInput = document.querySelector('#lobby-date');
const urlInput = document.querySelector('#spreadsheet-url');
const lobbySubmitButton = lobbyForm?.querySelector('button[type="submit"]');
const lobbyStatus = document.querySelector('[data-lobby-status]');
const lobbyList = document.querySelector('[data-lobby-list]');
const lobbyRefreshButton = document.querySelector('[data-lobby-refresh]');

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

function getAdminToken() {
  return tokenInput?.value.trim() || '';
}

function setMessage(element, message, type = '') {
  if (!element) return;
  element.textContent = message;
  element.className = `admin-status${type ? ` is-${type}` : ''}`;
}

async function apiRequest(url, method = 'GET', body, requireAuth = false) {
  const headers = { 'Content-Type': 'application/json' };

  if (requireAuth) {
    const token = getAdminToken();
    if (!token) throw new Error('管理用パスワードを入力してください。');
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
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

function formatDate(value) {
  if (typeof value !== 'string') return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : value;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
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

function renderRegistrationEmpty(message) {
  if (!registrationList) return;
  registrationList.innerHTML = '';
  const empty = document.createElement('p');
  empty.className = 'admin-list-empty';
  empty.textContent = message;
  registrationList.appendChild(empty);
}

function renderRegistrationCounts(counts = {}) {
  if (!registrationCounts) return;
  registrationCounts.innerHTML = '';

  const entries = [
    ['total', '合計'],
    ['pending', '申請中'],
    ['accepted', '参加確定'],
    ['waitlisted', '補欠'],
    ['cancelled', '辞退'],
    ['rejected', '却下']
  ];

  entries.forEach(([key, label]) => {
    const chip = document.createElement('span');
    chip.className = `count-chip count-${key}`;
    chip.textContent = `${label} ${Number(counts[key] || 0)}`;
    registrationCounts.appendChild(chip);
  });
}

function createRegistrationRow(registration) {
  const row = document.createElement('article');
  row.className = `registration-row status-${registration.status || 'pending'}`;

  const summary = document.createElement('div');
  summary.className = 'registration-summary';

  const event = document.createElement('p');
  event.className = 'registration-event';
  event.textContent = registration.eventLabel || registration.eventId || '';

  const identity = document.createElement('div');
  identity.className = 'registration-identity';

  const battleTag = document.createElement('strong');
  battleTag.textContent = registration.battleTag || '';

  const xLink = document.createElement('a');
  const username = String(registration.xAccount || '').replace(/^@/, '');
  xLink.href = `https://x.com/${encodeURIComponent(username)}`;
  xLink.target = '_blank';
  xLink.rel = 'noopener noreferrer';
  xLink.textContent = registration.xAccount || '';

  identity.append(battleTag, xLink);

  const meta = document.createElement('p');
  meta.className = 'registration-meta';
  meta.textContent = `${registration.applicationCode || ''} ／ 申請 ${formatDateTime(registration.createdAt)}`;

  summary.append(event, identity, meta);

  const controls = document.createElement('div');
  controls.className = 'registration-controls';

  const statusLabel = document.createElement('label');
  statusLabel.textContent = '状態';

  const statusSelect = document.createElement('select');
  Object.entries(STATUS_LABELS).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === registration.status;
    statusSelect.appendChild(option);
  });

  const noteLabel = document.createElement('label');
  noteLabel.textContent = '管理メモ';

  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.maxLength = 500;
  noteInput.placeholder = '連絡状況など';
  noteInput.value = registration.adminNote || '';

  const actions = document.createElement('div');
  actions.className = 'registration-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'save-button';
  saveButton.textContent = '保存';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-button';
  deleteButton.textContent = '削除';

  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    deleteButton.disabled = true;
    setMessage(registrationStatus, '申請状態を更新しています。');

    try {
      await apiRequest(REGISTRATIONS_API_URL, 'PATCH', {
        id: registration.id,
        status: statusSelect.value,
        adminNote: noteInput.value
      }, true);
      saveToken();
      setMessage(registrationStatus, '申請状態を更新しました。', 'success');
      await loadRegistrations();
    } catch (error) {
      setMessage(registrationStatus, error.message, 'error');
      saveButton.disabled = false;
      deleteButton.disabled = false;
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`${registration.battleTag} の申請を完全に削除しますか？`)) return;

    saveButton.disabled = true;
    deleteButton.disabled = true;
    setMessage(registrationStatus, '申請を削除しています。');

    try {
      await apiRequest(REGISTRATIONS_API_URL, 'DELETE', { id: registration.id }, true);
      saveToken();
      setMessage(registrationStatus, '申請を削除しました。', 'success');
      await loadRegistrations();
    } catch (error) {
      setMessage(registrationStatus, error.message, 'error');
      saveButton.disabled = false;
      deleteButton.disabled = false;
    }
  });

  actions.append(saveButton, deleteButton);
  controls.append(statusLabel, statusSelect, noteLabel, noteInput, actions);
  row.append(summary, controls);
  return row;
}

function renderRegistrations(registrations, counts) {
  if (!registrationList) return;
  const items = Array.isArray(registrations) ? registrations : [];
  renderRegistrationCounts(counts);

  if (items.length === 0) {
    renderRegistrationEmpty('条件に一致する参加申請はありません。');
    return;
  }

  registrationList.innerHTML = '';
  items.forEach((registration) => {
    registrationList.appendChild(createRegistrationRow(registration));
  });
}

async function loadRegistrations() {
  if (!getAdminToken()) {
    renderRegistrationEmpty('管理用パスワードを入力して「申請一覧を読み込む」を押してください。');
    renderRegistrationCounts();
    return;
  }

  renderRegistrationEmpty('参加申請を読み込んでいます。');
  setMessage(registrationStatus, '');

  const params = new URLSearchParams();
  if (registrationEventFilter?.value) params.set('eventId', registrationEventFilter.value);
  if (registrationStatusFilter?.value) params.set('status', registrationStatusFilter.value);
  const url = params.size ? `${REGISTRATIONS_API_URL}?${params}` : REGISTRATIONS_API_URL;

  try {
    const data = await apiRequest(url, 'GET', undefined, true);
    saveToken();
    renderRegistrations(data.registrations, data.counts);
    setMessage(authStatus, '管理者認証に成功しました。', 'success');
  } catch (error) {
    renderRegistrationEmpty('参加申請を読み込めませんでした。');
    renderRegistrationCounts();
    setMessage(registrationStatus, error.message, 'error');
    setMessage(authStatus, error.message, 'error');
  }
}

function renderLobbyEmpty(message) {
  if (!lobbyList) return;
  lobbyList.innerHTML = '';
  const empty = document.createElement('p');
  empty.className = 'admin-list-empty';
  empty.textContent = message;
  lobbyList.appendChild(empty);
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
    setMessage(lobbyStatus, '削除しています。');

    try {
      const data = await apiRequest(PAST_LOBBIES_API_URL, 'DELETE', { id: lobby.id }, true);
      saveToken();
      renderLobbies(data.lobbies);
      setMessage(lobbyStatus, 'Past Lobbyを削除しました。', 'success');
    } catch (error) {
      deleteButton.disabled = false;
      setMessage(lobbyStatus, error.message, 'error');
    }
  });

  row.append(date, link, deleteButton);
  return row;
}

function renderLobbies(lobbies) {
  if (!lobbyList) return;
  const items = Array.isArray(lobbies) ? lobbies : [];

  if (items.length === 0) {
    renderLobbyEmpty('登録済みのPast Lobbyはありません。');
    return;
  }

  lobbyList.innerHTML = '';
  items.forEach((lobby) => lobbyList.appendChild(createLobbyRow(lobby)));
}

async function loadLobbies() {
  renderLobbyEmpty('読み込んでいます。');

  try {
    const data = await apiRequest(PAST_LOBBIES_API_URL);
    renderLobbies(data.lobbies);
  } catch (error) {
    renderLobbyEmpty('登録済みロビーを読み込めませんでした。');
    setMessage(lobbyStatus, error.message, 'error');
  }
}

lobbyForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const date = dateInput?.value || '';
  const spreadsheetUrl = urlInput?.value.trim() || '';

  if (!getAdminToken()) {
    setMessage(lobbyStatus, '管理用パスワードを入力してください。', 'error');
    tokenInput?.focus();
    return;
  }

  if (!date) {
    setMessage(lobbyStatus, '開催日を入力してください。', 'error');
    dateInput?.focus();
    return;
  }

  if (!isGoogleSpreadsheetUrl(spreadsheetUrl)) {
    setMessage(lobbyStatus, 'GoogleスプレッドシートのURLを入力してください。', 'error');
    urlInput?.focus();
    return;
  }

  lobbySubmitButton.disabled = true;
  setMessage(lobbyStatus, '追加しています。');

  try {
    const data = await apiRequest(PAST_LOBBIES_API_URL, 'POST', { date, spreadsheetUrl }, true);
    saveToken();
    renderLobbies(data.lobbies);
    urlInput.value = '';
    setMessage(lobbyStatus, 'Past Lobbyへ追加しました。', 'success');
  } catch (error) {
    setMessage(lobbyStatus, error.message, 'error');
  } finally {
    lobbySubmitButton.disabled = false;
  }
});

tokenInput?.addEventListener('change', saveToken);
authButton?.addEventListener('click', loadRegistrations);
registrationRefreshButton?.addEventListener('click', loadRegistrations);
registrationEventFilter?.addEventListener('change', loadRegistrations);
registrationStatusFilter?.addEventListener('change', loadRegistrations);
lobbyRefreshButton?.addEventListener('click', loadLobbies);

restoreToken();
setDefaultDate();
loadLobbies();
if (getAdminToken()) loadRegistrations();
