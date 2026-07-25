const API_URL = './results.json';
const TRIBE_API_URL = './tribes.json?v=20260725-day4-complete-v1';
const S2_DATES = ['6/27', '7/4', '7/18', '7/25'];
const S2_TRIBE_ICON_BASE = '../tribewebp';

const SUMMARY_HEADERS = [
  { label: '最終順位', key: 'rank' },
  { label: 'Name', key: 'name' },
  { label: 'Day1', key: 'day1' },
  { label: 'Day2', key: 'day2' },
  { label: 'Day3', key: 'day3' },
  { label: 'Day4', key: 'day4' },
  { label: 'Total', key: 'total' }
];

const DAY_POINTS_HEADERS = [
  { label: 'Name', key: 'name' },
  { label: 'Daily Total', key: 'dailyTotal' },
  { label: '順位', key: 'rank' },
  ...Array.from({ length: 5 }, (_, index) => ({ label: `game${index + 1}`, key: `game${index + 1}` }))
];

const DAY_PLACEMENT_HEADERS = [
  { label: 'Name', key: 'name' },
  { label: '1st count', key: 'firstCount' },
  { label: 'average', key: 'average' },
  ...Array.from({ length: 5 }, (_, index) => ({ label: `game${index + 1}`, key: `game${index + 1}` }))
];

const GAME_DETAIL_HEADERS = [
  { label: 'Name', key: 'name' },
  { label: '順位', key: 'placement' },
  { label: 'HERO', key: 'hero' },
  { label: 'COMP', key: 'comp' },
  { label: 'Lesser 1', key: 'lesser1' },
  { label: 'Lesser 2', key: 'lesser2' },
  { label: 'Greater 1', key: 'greater1' },
  { label: 'Greater 2', key: 'greater2' },
  { label: 'Info', key: 'info' }
];

const S2_TRIBES = [
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

let loadedData = createFallbackData();
let tribeConfig = {};
let selectedDayIndex = 0;
let selectedGameIndex = 0;

const $ = id => document.getElementById(id);
const elements = {
  eventTitle: $('event-title'),
  summaryTable: $('summary-table'),
  dayTabs: $('day-tabs'),
  dayTitle: $('day-title'),
  dayPointsTable: $('day-points-table'),
  dayPlacementsTable: $('day-placements-table'),
  gameTabs: $('game-tabs'),
  gameTitle: $('game-title'),
  gameStartTime: $('game-start-time'),
  gameEndTime: $('game-end-time'),
  gameBan: $('game-ban'),
  gameAnomaly: $('game-anomaly'),
  gameDetailTable: $('game-detail-table')
};

function createFallbackData() {
  return {
    title: 'S級リーグS2',
    summary: { headers: SUMMARY_HEADERS, rows: [] },
    days: S2_DATES.map((date, dayIndex) => ({
      label: `DAY${dayIndex + 1}`,
      date,
      points: { headers: DAY_POINTS_HEADERS, rows: [] },
      placements: { headers: DAY_PLACEMENT_HEADERS, rows: [] },
      gameDetails: Array.from({ length: 5 }, (_, gameIndex) => ({
        label: `GAME${gameIndex + 1}`,
        startTime: '',
        endTime: '',
        anomaly: '',
        headers: GAME_DETAIL_HEADERS,
        rows: []
      }))
    }))
  };
}

function normalizeSeasonData(data) {
  const fallback = createFallbackData();
  const source = data && typeof data === 'object' ? data : {};
  const sourceDays = Array.isArray(source.days) ? source.days : [];

  return {
    ...fallback,
    title: source.title || fallback.title,
    updatedAt: source.updatedAt || '',
    summary: normalizeTableData(source.summary, SUMMARY_HEADERS),
    days: fallback.days.map((fallbackDay, index) => normalizeDay(sourceDays[index], fallbackDay))
  };
}

function normalizeDay(sourceDay, fallbackDay) {
  const source = sourceDay && typeof sourceDay === 'object' ? sourceDay : {};
  const sourceGames = Array.isArray(source.gameDetails) ? source.gameDetails : [];

  return {
    ...fallbackDay,
    ...source,
    label: source.label || fallbackDay.label,
    date: source.date || fallbackDay.date,
    points: normalizeTableData(source.points, DAY_POINTS_HEADERS),
    placements: normalizeTableData(source.placements, DAY_PLACEMENT_HEADERS),
    gameDetails: fallbackDay.gameDetails.map((fallbackGame, gameIndex) => {
      const game = sourceGames[gameIndex] && typeof sourceGames[gameIndex] === 'object' ? sourceGames[gameIndex] : {};
      return {
        ...fallbackGame,
        ...game,
        label: game.label || fallbackGame.label,
        headers: normalizeHeaders(game.headers, GAME_DETAIL_HEADERS),
        rows: Array.isArray(game.rows) ? game.rows : []
      };
    })
  };
}

function normalizeTableData(tableData, fallbackHeaders) {
  const source = tableData && typeof tableData === 'object' ? tableData : {};
  return {
    headers: normalizeHeaders(source.headers, fallbackHeaders),
    rows: Array.isArray(source.rows) ? source.rows : []
  };
}

function normalizeHeaders(headers, fallbackHeaders) {
  if (!Array.isArray(headers) || headers.length === 0) return fallbackHeaders.map(header => ({ ...header }));
  return headers.map((header, index) => {
    if (typeof header === 'string') return { label: header, key: inferHeaderKey(header, index) };
    return {
      ...header,
      label: header?.label || header?.key || `Column ${index + 1}`,
      key: header?.key || inferHeaderKey(header?.label, index)
    };
  });
}

function inferHeaderKey(label, index) {
  const normalized = String(label || '').trim().toLowerCase();
  if (normalized === 'name') return 'name';
  if (['順位', '最終順位', '暫定順位', 'placement'].includes(normalized)) return 'rank';
  if (normalized === 'total') return 'total';
  const dayMatch = normalized.match(/^day\s*(\d+)$/i);
  if (dayMatch) return `day${dayMatch[1]}`;
  const gameMatch = normalized.match(/^(?:game|g)\s*(\d+)$/i);
  if (gameMatch) return `game${gameMatch[1]}`;
  return `column${index + 1}`;
}

function hasResultData(data) {
  if (!data || typeof data !== 'object') return false;
  if (Array.isArray(data.summary?.rows) && data.summary.rows.length > 0) return true;
  return (data.days || []).some(day =>
    (day.points?.rows || []).length > 0
    || (day.placements?.rows || []).length > 0
    || (day.gameDetails || []).some(game => (game.rows || []).length > 0)
  );
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Static data error: ${response.status}`);
  return response.json();
}
