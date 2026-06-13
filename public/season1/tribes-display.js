const S1_TRIBE_API_URL = './tribes.json?v=s1-static-20260613';
const S1_TRIBES = [
  { name: 'ドラゴン', glyph: '竜', className: 'dragon' },
  { name: 'エレメンタル', glyph: '元', className: 'elemental' },
  { name: 'マーロック', glyph: '魚', className: 'murloc' },
  { name: 'ナーガ', glyph: '蛇', className: 'naga' },
  { name: 'キルボア', glyph: '猪', className: 'quilboar' },
  { name: '獣', glyph: '獣', className: 'beast' },
  { name: '悪魔', glyph: '魔', className: 'demon' },
  { name: 'メカ', glyph: '機', className: 'mech' },
  { name: '海賊', glyph: '賊', className: 'pirate' },
  { name: 'アンデッド', glyph: '霊', className: 'undead' }
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

    return `
      <span class="tribe-item ${state} tribe-${tribe.className}">
        <span class="tribe-icon" aria-hidden="true"><span class="tribe-glyph">${escapeHtml(tribe.glyph)}</span></span>
        <span class="tribe-name">${escapeHtml(tribe.name)}</span>
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
