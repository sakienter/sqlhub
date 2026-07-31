const EVENTS_API = '/api/scrims/events';
const REGISTRATIONS_API = '/api/scrims/registrations';
const LOBBIES_API = '/api/scrims/past-lobbies';
const TOKEN_KEY = 'scrim-admin-token';

const STATUS_LABELS = {
  pending: '申請中',
  accepted: '参加確定',
  waitlisted: '補欠',
  cancelled: '辞退',
  rejected: '却下'
};

const completionStyle = document.createElement('style');
completionStyle.textContent = `
  .event-row.is-completed { border-left-color:#74519a; }
  .event-result-label { grid-column:1 / 2; }
  .event-result-input { grid-column:2 / -1; }
  .event-result-help {
    grid-column:2 / -1;
    margin:-2px 0 2px;
    color:#66727c;
    font-size:11px;
    font-weight:650;
    line-height:1.55;
  }
  @media (max-width:680px) {
    .event-result-label,.event-result-input,.event-result-help { grid-column:1; }
  }
`;
document.head.appendChild(completionStyle);

const tokenInput = document.querySelector('#admin-token');
const authButton = document.querySelector('[data-auth-load]');
const authStatus = document.querySelector('[data-auth-status]');

const eventForm = document.querySelector('[data-event-form]');
const eventNameInput = document.querySelector('#event-name');
const eventDateInput = document.querySelector('#event-date');
const eventStartInput = document.querySelector('#event-start-time');
const eventGatherInput = document.querySelector('#event-gather-time');
const eventStatus = document.querySelector('[data-event-status]');
const eventList = document.querySelector('[data-event-list]');
const eventRefresh = document.querySelector('[data-event-refresh]');

const registrationEventFilter = document.querySelector('#registration-event-filter');
const registrationStatusFilter = document.querySelector('#registration-status-filter');
const registrationPageSize = document.querySelector('#registration-page-size');
const registrationStatus = document.querySelector('[data-registration-status]');
const registrationCounts = document.querySelector('[data-registration-counts]');
const registrationList = document.querySelector('[data-registration-list]');
const registrationRefresh = document.querySelector('[data-registration-refresh]');
const registrationPageInfo = document.querySelector('[data-registration-page-info]');
const registrationPager = document.querySelector('[data-registration-pager]');
const registrationPageCurrent = document.querySelector('[data-registration-page-current]');
const registrationPrev = document.querySelector('[data-registration-prev]');
const registrationNext = document.querySelector('[data-registration-next]');

let registrationItems = [];
let registrationCurrentPage = 1;

const lobbyForm = document.querySelector('[data-lobby-form]');
const lobbyDateInput = document.querySelector('#lobby-date');
const lobbyUrlInput = document.querySelector('#spreadsheet-url');
const lobbyStatus = document.querySelector('[data-lobby-status]');
const lobbyList = document.querySelector('[data-lobby-list]');
const lobbyRefresh = document.querySelector('[data-lobby-refresh]');

function token() {
  return tokenInput?.value.trim() || '';
}

function saveToken() {
  if (token()) sessionStorage.setItem(TOKEN_KEY, token());
  else sessionStorage.removeItem(TOKEN_KEY);
}

function setMessage(element, message, type = '') {
  if (!element) return;
  element.textContent = message;
  element.className = `admin-status${type ? ` is-${type}` : ''}`;
}

function empty(container, message) {
  if (!container) return;
  container.innerHTML = '';
  const paragraph = document.createElement('p');
  paragraph.className = 'admin-list-empty';
  paragraph.textContent = message;
  container.appendChild(paragraph);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

async function api(url, method = 'GET', body, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    if (!token()) throw new Error('管理用パスワードを入力してください。');
    headers.Authorization = `Bearer ${token()}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });

  let data = {};
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `処理に失敗しました。（HTTP ${response.status}）`);
  return data;
}

function eventStateSuffix(event) {
  if (event.status === 'completed') return '（開催終了）';
  if (event.status === 'closed') return '（受付停止）';
  return '';
}

function populateEventFilter(events) {
  const current = registrationEventFilter.value;
  registrationEventFilter.innerHTML = '<option value="">すべて</option>';

  events.forEach((event) => {
    const option = document.createElement('option');
    option.value = event.eventId;
    option.textContent = `${event.displayLabel}${eventStateSuffix(event)}`;
    registrationEventFilter.appendChild(option);
  });

  if ([...registrationEventFilter.options].some((option) => option.value === current)) {
    registrationEventFilter.value = current;
  }
}

function createEventRow(event) {
  const row = document.createElement('article');
  row.className = 'event-row';
  if (event.status === 'closed') row.classList.add('is-closed');
  if (event.status === 'completed') row.classList.add('is-completed');

  const summary = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = event.displayLabel;

  const meta = document.createElement('p');
  meta.className = 'event-meta';
  if (event.status === 'open') meta.textContent = '公開フォームで受付中';
  else if (event.status === 'completed') meta.textContent = '開催終了・Past Lobbyへ連動済み';
  else meta.textContent = '受付停止・公開フォームでは非表示';
  summary.append(title, meta);

  const controls = document.createElement('div');
  controls.className = 'event-controls';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'event-name-label';
  nameLabel.textContent = 'スクリム名';
  const nameInput = document.createElement('input');
  nameInput.className = 'event-name-input';
  nameInput.type = 'text';
  nameInput.maxLength = 60;
  nameInput.placeholder = '例：大会前練習会';
  nameInput.value = event.eventName || '';

  const startLabel = document.createElement('label');
  startLabel.textContent = '開始';
  const startInput = document.createElement('input');
  startInput.type = 'time';
  startInput.value = event.startTime;

  const gatherLabel = document.createElement('label');
  gatherLabel.textContent = '集合';
  const gatherInput = document.createElement('input');
  gatherInput.type = 'time';
  gatherInput.value = event.gatherTime || '';

  const statusLabel = document.createElement('label');
  statusLabel.textContent = '状態';
  const statusSelect = document.createElement('select');
  [
    ['open', '受付中'],
    ['closed', '受付停止'],
    ['completed', '開催終了']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === event.status;
    statusSelect.appendChild(option);
  });

  const resultLabel = document.createElement('label');
  resultLabel.className = 'event-result-label';
  resultLabel.textContent = '結果URL';

  const resultInput = document.createElement('input');
  resultInput.className = 'event-result-input';
  resultInput.type = 'url';
  resultInput.inputMode = 'url';
  resultInput.placeholder = 'https://docs.google.com/spreadsheets/...';
  resultInput.value = event.resultUrl || '';

  const resultHelp = document.createElement('p');
  resultHelp.className = 'event-result-help';
  resultHelp.textContent = '「開催終了」にすると、このURLがPast Lobbyへ自動追加されます。';

  function updateResultRequirement() {
    resultInput.required = statusSelect.value === 'completed';
    resultLabel.textContent = statusSelect.value === 'completed' ? '結果URL（必須）' : '結果URL';
  }
  statusSelect.addEventListener('change', updateResultRequirement);
  updateResultRequirement();

  const actions = document.createElement('div');
  actions.className = 'event-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'save-button';
  save.textContent = '保存';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete-button';
  remove.textContent = '削除';

  save.addEventListener('click', async () => {
    save.disabled = remove.disabled = true;
    setMessage(eventStatus, '日程を更新しています。');

    try {
      const data = await api(EVENTS_API, 'PATCH', {
        id: event.id,
        eventName: nameInput.value.trim(),
        startTime: startInput.value,
        gatherTime: gatherInput.value,
        status: statusSelect.value,
        resultUrl: resultInput.value.trim()
      }, true);

      saveToken();
      setMessage(
        eventStatus,
        data.pastLobbySynced
          ? '開催終了に変更し、Past Lobbyへ追加しました。'
          : '日程を更新しました。',
        'success'
      );
      await loadEvents();
      await loadRegistrations();
      await loadLobbies();
    } catch (error) {
      setMessage(eventStatus, error.message, 'error');
      save.disabled = remove.disabled = false;
    }
  });

  remove.addEventListener('click', async () => {
    if (!confirm(`${event.displayLabel} を削除しますか？`)) return;
    save.disabled = remove.disabled = true;
    setMessage(eventStatus, '日程を削除しています。');

    try {
      await api(EVENTS_API, 'DELETE', { id: event.id }, true);
      saveToken();
      setMessage(eventStatus, '日程を削除しました。', 'success');
      await loadEvents();
      await loadRegistrations();
      await loadLobbies();
    } catch (error) {
      setMessage(eventStatus, error.message, 'error');
      save.disabled = remove.disabled = false;
    }
  });

  actions.append(save, remove);
  controls.append(
    nameLabel, nameInput,
    startLabel, startInput,
    gatherLabel, gatherInput,
    statusLabel, statusSelect,
    resultLabel, resultInput, resultHelp,
    actions
  );
  row.append(summary, controls);
  return row;
}

async function loadEvents() {
  if (!token()) {
    empty(eventList, '管理用パスワードを入力してください。');
    return [];
  }

  empty(eventList, '開催日程を読み込んでいます。');
  try {
    const data = await api(`${EVENTS_API}?all=1`, 'GET', undefined, true);
    const events = Array.isArray(data.events) ? data.events : [];
    saveToken();
    populateEventFilter(events);

    if (!events.length) empty(eventList, '登録済みの日程はありません。');
    else {
      eventList.innerHTML = '';
      events.forEach((event) => eventList.appendChild(createEventRow(event)));
    }
    return events;
  } catch (error) {
    empty(eventList, '開催日程を読み込めませんでした。');
    setMessage(eventStatus, error.message, 'error');
    throw error;
  }
}

eventForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!token()) {
    setMessage(eventStatus, '管理用パスワードを入力してください。', 'error');
    return;
  }

  const submit = eventForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setMessage(eventStatus, '新しい日程を作成しています。');

  try {
    await api(EVENTS_API, 'POST', {
      eventName: eventNameInput.value.trim(),
      eventDate: eventDateInput.value,
      startTime: eventStartInput.value,
      gatherTime: eventGatherInput.value
    }, true);
    saveToken();
    eventDateInput.value = '';
    eventNameInput.value = '';
    setMessage(eventStatus, '新しい日程を作成しました。公開フォームへ自動反映されます。', 'success');
    await loadEvents();
  } catch (error) {
    setMessage(eventStatus, error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

function renderCounts(counts = {}) {
  registrationCounts.innerHTML = '';
  [
    ['total', '合計'],
    ['pending', '申請中'],
    ['accepted', '参加確定'],
    ['waitlisted', '補欠'],
    ['cancelled', '辞退'],
    ['rejected', '却下']
  ].forEach(([key, label]) => {
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
  const event = document.createElement('p');
  event.className = 'registration-event';
  event.textContent = registration.eventLabel || registration.eventId || '';

  const identity = document.createElement('div');
  identity.className = 'registration-identity';
  const battle = document.createElement('strong');
  battle.textContent = registration.battleTag || '';
  const x = document.createElement('a');
  const username = String(registration.xAccount || '').replace(/^@/, '');
  x.href = `https://x.com/${encodeURIComponent(username)}`;
  x.target = '_blank';
  x.rel = 'noopener noreferrer';
  x.textContent = registration.xAccount || '';
  identity.append(battle, x);

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
  const note = document.createElement('input');
  note.type = 'text';
  note.maxLength = 500;
  note.placeholder = '連絡状況など';
  note.value = registration.adminNote || '';

  const actions = document.createElement('div');
  actions.className = 'registration-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'save-button';
  save.textContent = '保存';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete-button';
  remove.textContent = '削除';

  save.addEventListener('click', async () => {
    save.disabled = remove.disabled = true;
    setMessage(registrationStatus, '申請状態を更新しています。');
    try {
      await api(REGISTRATIONS_API, 'PATCH', {
        id: registration.id,
        status: statusSelect.value,
        adminNote: note.value
      }, true);
      saveToken();
      setMessage(registrationStatus, '申請状態を更新しました。', 'success');
      await loadRegistrations();
    } catch (error) {
      setMessage(registrationStatus, error.message, 'error');
      save.disabled = remove.disabled = false;
    }
  });

  remove.addEventListener('click', async () => {
    if (!confirm(`${registration.battleTag} の申請を完全に削除しますか？`)) return;
    save.disabled = remove.disabled = true;
    try {
      await api(REGISTRATIONS_API, 'DELETE', { id: registration.id }, true);
      setMessage(registrationStatus, '申請を削除しました。', 'success');
      await loadRegistrations();
    } catch (error) {
      setMessage(registrationStatus, error.message, 'error');
      save.disabled = remove.disabled = false;
    }
  });

  actions.append(save, remove);
  controls.append(statusLabel, statusSelect, noteLabel, note, actions);
  row.append(summary, controls);
  return row;
}

function renderRegistrationPage() {
  const pageSize = Math.max(1, Number(registrationPageSize?.value || 10));
  const totalItems = registrationItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  registrationCurrentPage = Math.min(Math.max(1, registrationCurrentPage), totalPages);

  if (!totalItems) {
    empty(registrationList, '条件に一致する参加申請はありません。');
    registrationPageInfo.textContent = '表示 0件';
    registrationPager.hidden = true;
    return;
  }

  const start = (registrationCurrentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  registrationList.innerHTML = '';
  registrationItems.slice(start, end).forEach((item) => {
    registrationList.appendChild(createRegistrationRow(item));
  });

  registrationPageInfo.textContent = `${start + 1}〜${end}件を表示 ／ 該当 ${totalItems}件`;
  registrationPageCurrent.textContent = `${registrationCurrentPage} / ${totalPages}ページ`;
  registrationPrev.disabled = registrationCurrentPage <= 1;
  registrationNext.disabled = registrationCurrentPage >= totalPages;
  registrationPager.hidden = totalPages <= 1;
}

async function loadRegistrations() {
  if (!token()) {
    empty(registrationList, '管理用パスワードを入力してください。');
    renderCounts();
    return;
  }

  empty(registrationList, '参加申請を読み込んでいます。');
  const params = new URLSearchParams();
  if (registrationEventFilter.value) params.set('eventId', registrationEventFilter.value);
  if (registrationStatusFilter.value) params.set('status', registrationStatusFilter.value);

  try {
    const suffix = params.toString() ? `?${params}` : '';
    const data = await api(`${REGISTRATIONS_API}${suffix}`, 'GET', undefined, true);
    const items = Array.isArray(data.registrations) ? data.registrations : [];
    renderCounts(data.counts);

    registrationItems = items;
    renderRegistrationPage();
  } catch (error) {
    registrationItems = [];
    empty(registrationList, '参加申請を読み込めませんでした。');
    registrationPageInfo.textContent = '';
    registrationPager.hidden = true;
    renderCounts();
    setMessage(registrationStatus, error.message, 'error');
  }
}

function isSheetUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'docs.google.com' &&
      url.pathname.startsWith('/spreadsheets/');
  } catch {
    return false;
  }
}

function createLobbyRow(lobby) {
  const row = document.createElement('article');
  row.className = 'admin-lobby-row';
  const date = document.createElement('span');
  date.className = 'admin-lobby-date';
  date.textContent = lobby.date;
  const link = document.createElement('a');
  link.className = 'admin-lobby-link';
  link.href = lobby.spreadsheetUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = lobby.spreadsheetUrl;
  const remove = document.createElement('button');
  remove.className = 'delete-button';
  remove.type = 'button';
  remove.textContent = '削除';

  remove.addEventListener('click', async () => {
    if (!confirm(`${lobby.date} のPast Lobbyを削除しますか？`)) return;
    remove.disabled = true;
    try {
      const data = await api(LOBBIES_API, 'DELETE', { id: lobby.id }, true);
      renderLobbies(data.lobbies);
      setMessage(lobbyStatus, 'Past Lobbyを削除しました。', 'success');
    } catch (error) {
      setMessage(lobbyStatus, error.message, 'error');
      remove.disabled = false;
    }
  });

  row.append(date, link, remove);
  return row;
}

function renderLobbies(items) {
  if (!Array.isArray(items) || !items.length) {
    empty(lobbyList, '登録済みのPast Lobbyはありません。');
    return;
  }
  lobbyList.innerHTML = '';
  items.forEach((item) => lobbyList.appendChild(createLobbyRow(item)));
}

async function loadLobbies() {
  empty(lobbyList, '読み込んでいます。');
  try {
    const data = await api(LOBBIES_API);
    renderLobbies(data.lobbies);
  } catch (error) {
    empty(lobbyList, '登録済みロビーを読み込めませんでした。');
    setMessage(lobbyStatus, error.message, 'error');
  }
}

lobbyForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!token()) {
    setMessage(lobbyStatus, '管理用パスワードを入力してください。', 'error');
    return;
  }
  if (!isSheetUrl(lobbyUrlInput.value.trim())) {
    setMessage(lobbyStatus, 'GoogleスプレッドシートのURLを入力してください。', 'error');
    return;
  }

  const submit = lobbyForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const data = await api(LOBBIES_API, 'POST', {
      date: lobbyDateInput.value,
      spreadsheetUrl: lobbyUrlInput.value.trim()
    }, true);
    renderLobbies(data.lobbies);
    lobbyUrlInput.value = '';
    setMessage(lobbyStatus, 'Past Lobbyへ追加しました。', 'success');
  } catch (error) {
    setMessage(lobbyStatus, error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

async function loadAdminData() {
  setMessage(authStatus, '管理データを読み込んでいます。');
  try {
    await loadEvents();
    await loadRegistrations();
    saveToken();
    setMessage(authStatus, '管理者認証に成功しました。', 'success');
  } catch (error) {
    setMessage(authStatus, error.message, 'error');
  }
}

tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || '';
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
lobbyDateInput.value = today;

authButton?.addEventListener('click', loadAdminData);
eventRefresh?.addEventListener('click', loadEvents);
registrationRefresh?.addEventListener('click', loadRegistrations);
registrationEventFilter?.addEventListener('change', () => { registrationCurrentPage = 1; loadRegistrations(); });
registrationStatusFilter?.addEventListener('change', () => { registrationCurrentPage = 1; loadRegistrations(); });
registrationPageSize?.addEventListener('change', () => { registrationCurrentPage = 1; renderRegistrationPage(); });
registrationPrev?.addEventListener('click', () => {
  registrationCurrentPage -= 1;
  renderRegistrationPage();
  registrationList.scrollIntoView({ behavior:'smooth', block:'start' });
});
registrationNext?.addEventListener('click', () => {
  registrationCurrentPage += 1;
  renderRegistrationPage();
  registrationList.scrollIntoView({ behavior:'smooth', block:'start' });
});
lobbyRefresh?.addEventListener('click', loadLobbies);
tokenInput?.addEventListener('change', saveToken);

loadLobbies();
if (token()) loadAdminData();
