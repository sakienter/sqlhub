const S1_TRIBE_API_URL = './tribes.json?v=s1-static-20260613';
const S1_TRIBE_ICON_BASE = 'https://raw.githubusercontent.com/sakienter/sqlhub/502f402c517e6af60511ca6623750a59bf946d09/np';
const S1_TRIBES = [
  { name: 'アンデッド', label: 'Undead', file: '145px-Undead_hover.webp', className: 'undead' },
  { name: 'エレメンタル', label: 'Elemental', file: '145px-Elemental_hover.webp', className: 'elemental' },
  { name: 'ドラゴン', label: 'Dragon', file: '145px-Dragon_hover.webp', className: 'dragon' },
  { name: 'キルボア', label: 'Quilboar', file: '145px-Quilboar_hover.webp', className: 'quilboar' },
  { name: 'ナーガ', label: 'Naga', file: '145px-Naga_hover.webp', className: 'naga' },
  { name: 'マーロック', label: 'Murloc', file: '145px-Murloc_hover.webp', className: 'murloc' },
  { name: 'メカ', label: 'Mech', file: '145px-Mech_hover.webp', className: 'mech' },
  { name: '悪魔', label: 'Demon', file: '145px-Demon_hover.webp', className: 'demon' },
  { name: '海賊', label: 'Pirate', file: '145px-Pirate_hover.webp', className: 'pirate' },
  { name: '獣', label: 'Beast', file: '145px-Beast_hover.webp', className: 'beast' }
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
    const imageUrl = `${S1_TRIBE_ICON_BASE}/${tribe.file}`;

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
