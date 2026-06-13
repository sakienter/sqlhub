const TRIBE_API_URL = '/api/season1/tribes';
const ADMIN_TRIBE_API_URL = '/api/season1/admin/tribes';
const TRIBES = ['アンデッド', 'エレメンタル', 'ドラゴン', 'キルボア', 'ナーガ', 'マーロック', 'メカ', '悪魔', '海賊', '獣'];

let tribeConfig = {};
let currentAvailable = new Set();

const $ = id => document.getElementById(id);
const elements = {
  password: $('admin-password'),
  day: $('admin-day'),
  game: $('admin-game'),
  buttons: $('tribe-buttons'),
  saveButton: $('tribe-save-button'),
  status: $('tribe-save-status'),
  preview: $('admin-preview-text')
};

init();

async function init() {
  bindEvents();
  await loadConfig();
  syncSelectionFromConfig();
  renderButtons();
  renderPreview();
}

function bindEvents() {
  elements.day.addEventListener('change', () => {
    syncSelectionFromConfig();
    renderButtons();
    renderPreview();
  });

  elements.game.addEventListener('change', () => {
    syncSelectionFromConfig();
    renderButtons();
    renderPreview();
  });

  elements.saveButton.addEventListener('click', saveCurrentConfig);
}

async function loadConfig() {
  try {
    setStatus('設定を読み込んでいます...');
    const response = await fetch(TRIBE_API_URL, { cache: 'no-store' });
    tribeConfig = response.ok ? await response.json() : {};
    setStatus('');
  } catch (error) {
    console.error(error);
    tribeConfig = {};
    setStatus('設定の読み込みに失敗しました。空の状態で編集します。');
  }
}

function syncSelectionFromConfig() {
  const info = getCurrentInfo();
  currentAvailable = new Set(Array.isArray(info.available) ? info.available : []);
}

function renderButtons() {
  elements.buttons.innerHTML = '';

  TRIBES.forEach(tribe => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tribe-toggle ' + (currentAvailable.has(tribe) ? 'is-available' : 'is-unavailable');
    button.textContent = tribe;
    button.addEventListener('click', () => {
      if (currentAvailable.has(tribe)) currentAvailable.delete(tribe);
      else currentAvailable.add(tribe);
      renderButtons();
      renderPreview();
    });
    elements.buttons.appendChild(button);
  });
}

function renderPreview() {
  const available = TRIBES.filter(tribe => currentAvailable.has(tribe));
  const unavailable = TRIBES.filter(tribe => !currentAvailable.has(tribe));
  elements.preview.innerHTML = `BAN）登場種族：${esc(joinOrDash(available))}<br><span class="ban-subline">非登場種族：${esc(joinOrDash(unavailable))}</span>`;
}

async function saveCurrentConfig() {
  const password = elements.password.value;
  if (!password) {
    setStatus('管理パスワードを入力してください。');
    return;
  }

  const available = TRIBES.filter(tribe => currentAvailable.has(tribe));

  try {
    elements.saveButton.disabled = true;
    setStatus('保存しています...');

    const response = await fetch(ADMIN_TRIBE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        day: elements.day.value,
        game: elements.game.value,
        available
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || `保存に失敗しました: ${response.status}`);
    }

    tribeConfig = result.config || tribeConfig;
    setStatus('保存しました。公開ページにも反映されます。');
  } catch (error) {
    console.error(error);
    setStatus(error.message || '保存に失敗しました。');
  } finally {
    elements.saveButton.disabled = false;
  }
}

function getCurrentInfo() {
  const day = elements.day.value;
  const game = elements.game.value;
  return tribeConfig?.[day]?.[game] || { available: [], unavailable: [...TRIBES] };
}

function setStatus(text) {
  elements.status.textContent = text;
}

function joinOrDash(values) {
  return values.length ? values.join(', ') : '-';
}

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
