const S1_TRIBE_API_URL = './tribes.json?v=s1-static-20260613';
const S1_TRIBE_ICON_BASE = '../tribewebp';
const S1_TRIBE_ICON_VERSION = '20260613-200154';
const S1_TRIBES = [
  { name: 'アンデッド', label: 'Undead', file: 'unde.webp', className: 'undead' },
  { name: 'エレメンタル', label: 'Elemental', file: 'ele.webp', className: 'elemental' },
  { name: 'ドラゴン', label: 'Dragon', file: 'dragon.webp', className: 'dragon' },
  { name: 'キルボア', label: 'Quilboar', file: 'quilboar.webp', className: 'quilboar' },
  { name: 'ナーガ', label: 'Naga', file: 'naga.webp', className: 'naga' },
  { name: 'マーロック', label: 'Murloc', file: 'ma.webp', className: 'murloc' },
  { name: 'メカ', label: 'Mech', file: 'mech.webp', className: 'mech' },
  { name: '悪魔', label: 'Demon', file: 'demon.webp', className: 'demon' },
  { name: '海賊', label: 'Pirate', file: 'pirates.webp', className: 'pirate' },
  { name: '獣', label: 'Beast', file: 'beast.webp', className: 'beast' }
];
let s1TribeConfig = {};

fetch(S1_TRIBE_API_URL, { cache: 'no-store' })
  .then(response => response.ok ? response.json() : {})
  .then(config => {
    s1TribeConfig = config || {};
    if (typeof renderSelectedGame === 'function') renderSelectedGame(selectedGameIndex || 0);
  })
  .catch(error => console.error(error));

const s1OriginalRenderGameMeta = renderGameMeta;
renderGameMeta = function renderGameMetaWithTribes(game) {
  s1OriginalRenderGameMeta(game);
  if (elements.gameBan) elements.gameBan.innerHTML = renderS1TribeInfo(game);
};

function renderS1TribeInfo(game) {
  const info = getS1TribeInfo(game);
  const available = new Set(info.available);
  const unavailable = new Set(info.unavailable);

  const items = S1_TRIBES.map(tribe => {
    const state = available.has(tribe.name)
      ? 'is-available'
      : unavailable.has(tribe.name)
        ? 'is-unavailable'
        : 'is-unknown';
    const imageUrl = `${S1_TRIBE_ICON_BASE}/${tribe.file}?v=${S1_TRIBE_ICON_VERSION}`;

    return `
      <span class="tribe-item ${state} tribe-${tribe.className}" data-tribe="${escapeHtml(tribe.className)}">
        <span class="tribe-icon" aria-hidden="true">
          <img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async">
        </span>
        <span class="tribe-name">${escapeHtml(tribe.label)}</span>
      </span>`;
  }).join('');

  return `
    <span class="tribe-panel">
      <span class="tribe-panel-title">Minion Types</span>
      <span class="tribe-grid">${items}</span>
    </span>`;
}

function getS1TribeInfo(game) {
  const day = loadedData?.days?.[selectedDayIndex];
  const dayKey = normalizeS1Key(day?.label || `DAY${selectedDayIndex + 1}`);
  const gameKey = normalizeS1Key(game?.label || `GAME${selectedGameIndex + 1}`);
  const info = s1TribeConfig?.[dayKey]?.[gameKey] || {};
  return {
    available: Array.isArray(info.available) ? info.available.filter(Boolean) : [],
    unavailable: Array.isArray(info.unavailable) ? info.unavailable.filter(Boolean) : []
  };
}

function normalizeS1Key(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}
