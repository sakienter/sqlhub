const EVENT_TITLE = 'S級リーグS1';

// スクリプトが対象スプレッドシートに紐づいている場合は空欄でOK。
// 単独Apps Scriptとして作っている場合は、スプレッドシートIDを入れてください。
const SPREADSHEET_ID = '';

const SCOREBOARD_SHEET_NAME = 'スコアボード';
const TOTAL_SHEET_NAME = 'Total';
const DAILY_RANKING_SHEET_NAME = 'Daily Ranking';
const GAME_INFO_SHEET_NAME = 'GameInfo';

const DAY_CONFIGS = [
  {
    id: 'day1',
    label: 'DAY1',
    date: '2026/04/25',
    sheetName: '20260425',
    games: ['game1', 'game2', 'game3', 'game4', 'game5'],
    dailyRankingRange: 'B6:D13'
  },
  {
    id: 'day2',
    label: 'DAY2',
    date: '2026/05/02',
    sheetName: '20260502',
    games: ['game1', 'game2', 'game3', 'game4', 'game5'],
    dailyRankingRange: 'F6:H13'
  },
  {
    id: 'day3',
    label: 'DAY3',
    date: '2026/05/16',
    sheetName: '20260516',
    games: ['game1', 'game2', 'game3', 'game4', 'game5'],
    dailyRankingRange: 'J6:L13'
  },
  {
    id: 'day4',
    label: 'DAY4',
    date: '2026/05/30',
    sheetName: '20260530',
    games: ['game1', 'game2', 'game3', 'game4', 'game5'],
    dailyRankingRange: 'N6:P13'
  }
];

function doGet() {
  try {
    const ss = getSpreadsheet();
    const gameInfoMap = readGameInfoMap(ss);

    const result = {
      title: EVENT_TITLE,
      updatedAt: new Date().toISOString(),
      summary: readSummary(ss),
      days: DAY_CONFIGS.map(config => readDay(ss, config, gameInfoMap))
    };

    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({
      title: EVENT_TITLE,
      updatedAt: new Date().toISOString(),
      summary: {
        title: 'Total stats',
        groupHeaders: [],
        headers: [],
        rows: []
      },
      days: [],
      error: String(error && error.message ? error.message : error)
    });
  }
}

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function readSummary(ss) {
  const sheet = ss.getSheetByName(SCOREBOARD_SHEET_NAME);

  if (!sheet) {
    return {
      title: 'Total stats',
      groupHeaders: [],
      headers: [],
      rows: [],
      error: `Sheet not found: ${SCOREBOARD_SHEET_NAME}`
    };
  }

  const groupHeaders = [
    { label: 'ポイント集計', span: 3 },
    { label: 'Day1', span: 5 },
    { label: 'Day2', span: 5 },
    { label: 'Day3', span: 5 },
    { label: 'Day4', span: 5 }
  ];

  const headers = [
    { label: 'Name', key: 'name' },
    { label: 'Total Pt', key: 'totalPt' },
    { label: 'Pt 順位', key: 'ptRank' },
    ...Array.from({ length: 20 }, (_, i) => ({
      label: `game${i + 1}`,
      key: `game${i + 1}`,
      isGame20: i === 19
    }))
  ];

  // スコアボードシートの横長ポイント表を読む。
  // B4:X11 = Name / Total Pt / Pt順位 / game1〜game20
  const values = sheet.getRange('B4:X11').getDisplayValues();

  const rows = values
    .filter(row => String(row[0]).trim() !== '')
    .map(row => {
      const obj = {
        name: row[0],
        totalPt: normalizeNumber(row[1]),
        ptRank: row[2]
      };

      for (let i = 0; i < 20; i++) {
        obj[`game${i + 1}`] = normalizeNumber(row[3 + i]);
      }

      return obj;
    });

  return {
    title: 'Total stats',
    groupHeaders,
    headers,
    rows
  };
}

function readDay(ss, config, gameInfoMap) {
  const daySheet = ss.getSheetByName(config.sheetName);

  return {
    id: config.id,
    label: config.label,
    date: config.date,
    sheetName: config.sheetName,
    games: config.games,
    dailyScore: readDailyScore(ss, config),
    points: daySheet
      ? readPointTable(daySheet, config.games)
      : emptyTable(['Name', 'Daily Total', '順位'].concat(config.games), `Sheet not found: ${config.sheetName}`),
    placements: daySheet
      ? readPlacementTable(daySheet, config.games)
      : emptyTable(['Name', '1st count', 'average'].concat(config.games), `Sheet not found: ${config.sheetName}`),
    gameDetails: daySheet
      ? readGameDetails(daySheet, config, gameInfoMap)
      : []
  };
}

function readDailyScore(ss, config) {
  const sheet = ss.getSheetByName(DAILY_RANKING_SHEET_NAME);

  if (!sheet) {
    return emptyTable(['Name', 'Point', '順位'], `Sheet not found: ${DAILY_RANKING_SHEET_NAME}`);
  }

  const values = sheet.getRange(config.dailyRankingRange).getDisplayValues();

  const rows = values
    .filter(row => String(row[0]).trim() !== '')
    .map(row => ({
      name: row[0],
      point: normalizeNumber(row[1]),
      rank: row[2]
    }));

  return {
    headers: ['Name', 'Point', '順位'],
    rows
  };
}

function readPointTable(sheet, games) {
  const values = sheet.getDataRange().getDisplayValues();

  const headerRowIndex = findHeaderRow(values, ['Name', 'Daily Total']);

  if (headerRowIndex === -1) {
    return emptyTable(['Name', 'Daily Total', '順位'].concat(games), 'Point table header not found');
  }

  const headers = ['Name', 'Daily Total', '順位'].concat(games);

  const rows = values
    .slice(headerRowIndex + 1)
    .filter(row => String(row[0]).trim() !== '')
    .slice(0, 8)
    .map(row => {
      const obj = {
        name: row[0],
        dailyTotal: normalizeNumber(row[1]),
        rank: row[2]
      };

      games.forEach((game, index) => {
        obj[game] = normalizeNumber(row[3 + index]);
      });

      return obj;
    });

  return {
    headers,
    rows
  };
}

function readPlacementTable(sheet, games) {
  const values = sheet.getDataRange().getDisplayValues();

  const headerRowIndex = findHeaderRow(values, ['Placement', '1st count']);

  if (headerRowIndex === -1) {
    return emptyTable(['Name', '1st count', 'average'].concat(games), 'Placement table header not found');
  }

  const headers = ['Name', '1st count', 'average'].concat(games);

  const rows = values
    .slice(headerRowIndex + 1)
    .filter(row => String(row[0]).trim() !== '')
    .slice(0, 8)
    .map(row => {
      const obj = {
        name: row[0],
        firstCount: normalizeNumber(row[1]),
        average: normalizeNumber(row[2])
      };

      games.forEach((game, index) => {
        obj[game] = normalizeNumber(row[3 + index]);
      });

      return obj;
    });

  return {
    headers,
    rows
  };
}

// ★ 修正：GameInfoシートに加えて、各DAYシートのScheduleセクションも参照する
function readGameDetails(sheet, config, gameInfoMap) {
  return config.games.map((game, index) => {
    const manual = getManualGameInfo(gameInfoMap, config.id, game);
    const anomalyFromSheet = readGameValueFromSection(sheet, ['Anomaly'], game);
    const startTimeFromSheet = readScheduleValue(sheet, ['START TIME', 'START_TIME', 'start time'], game);
    const endTimeFromSheet = readScheduleValue(sheet, ['END TIME', 'END_TIME', 'end time'], game);

    return {
      id: game,
      label: `GAME${index + 1}`,
      startTime: manual.startTime || startTimeFromSheet || '',
      endTime: manual.endTime || endTimeFromSheet || '',
      ban: manual.ban || [],
      anomaly: manual.anomaly || anomalyFromSheet || '',
      rows: readGameRows(sheet, config.games, index)
    };
  });
}

// ★ 新規追加：各DAYシートの Schedule セクションから時刻を読む
function readScheduleValue(sheet, rowLabels, game) {
  const values = sheet.getDataRange().getDisplayValues();

  // "Schedule" セクション行を探す
  const scheduleSectionIndex = findSectionRow(values, ['Schedule', 'SCHEDULE']);
  if (scheduleSectionIndex === -1) return '';

  // Schedule セクション内でゲームヘッダー行（game1〜game5が並ぶ行）を探す
  let headerRowIndex = -1;
  for (let r = scheduleSectionIndex; r < Math.min(values.length, scheduleSectionIndex + 6); r++) {
    const rowText = values[r].map(cell => String(cell).trim());
    if (rowText.includes(game)) {
      headerRowIndex = r;
      break;
    }
  }
  if (headerRowIndex === -1) return '';

  const headerRow = values[headerRowIndex].map(cell => String(cell).trim());
  const gameColIndex = headerRow.indexOf(game);
  if (gameColIndex === -1) return '';

  // ヘッダー行より下で rowLabels に一致する行を探す
  const targets = rowLabels.map(label => label.trim().toLowerCase());
  for (let r = headerRowIndex + 1; r < Math.min(values.length, headerRowIndex + 10); r++) {
    const rowLabel = String(values[r][0]).trim().toLowerCase();
    if (targets.includes(rowLabel)) {
      return String(values[r][gameColIndex]).trim();
    }
  }

  return '';
}

function getManualGameInfo(gameInfoMap, dayId, gameId) {
  if (!gameInfoMap[dayId]) return {};
  return gameInfoMap[dayId][gameId] || {};
}

function readGameRows(sheet, games, gameIndex) {
  const placements = readPlayerGameMap(sheet, ['Placement'], games, gameIndex);
  const heroes = readPlayerGameMap(sheet, ['Hero Pick'], games, gameIndex);
  const comps = readPlayerGameMap(sheet, ['Comp'], games, gameIndex);
  const lesser = readPlayerGameMap(sheet, ['Lesser trinkets'], games, gameIndex);
  const greater = readPlayerGameMap(sheet, ['Greater trinkets'], games, gameIndex);
  const info = readPlayerGameMap(sheet, ['Infomation', 'Information'], games, gameIndex);

  const names = uniqueNames([
    Object.keys(placements),
    Object.keys(heroes),
    Object.keys(comps),
    Object.keys(lesser),
    Object.keys(greater),
    Object.keys(info)
  ]);

  return names.map(name => {
    const lesserParts = splitDetailCell(lesser[name]);
    const greaterParts = splitDetailCell(greater[name]);

    return {
      name,
      placement: normalizeNumber(placements[name]),
      hero: heroes[name] || '',
      comp: comps[name] || '',
      lesser1: lesserParts[0] || '',
      lesser2: lesserParts[1] || '',
      greater1: greaterParts[0] || '',
      greater2: greaterParts[1] || '',
      info: info[name] || ''
    };
  });
}

function readPlayerGameMap(sheet, sectionNames, games, gameIndex) {
  const values = sheet.getDataRange().getDisplayValues();
  const sectionIndex = findSectionRow(values, sectionNames);

  if (sectionIndex === -1) return {};

  let headerRowIndex = -1;

  for (let r = sectionIndex; r < Math.min(values.length, sectionIndex + 8); r++) {
    const rowText = values[r].map(cell => String(cell).trim());

    if (games.some(game => rowText.includes(game))) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) return {};

  const headerRow = values[headerRowIndex].map(cell => String(cell).trim());
  const gameColumnIndex = headerRow.indexOf(games[gameIndex]);

  if (gameColumnIndex === -1) return {};

  const result = {};
  let readCount = 0;

  for (let r = headerRowIndex + 1; r < values.length; r++) {
    const name = String(values[r][0]).trim();

    if (!name) break;
    if (isSectionTitle(name)) break;

    result[name] = values[r][gameColumnIndex];
    readCount++;

    if (readCount >= 8) break;
  }

  return result;
}

function readGameValueFromSection(sheet, sectionNames, game) {
  const values = sheet.getDataRange().getDisplayValues();
  const sectionIndex = findSectionRow(values, sectionNames);

  if (sectionIndex === -1) return '';

  let headerRowIndex = -1;

  for (let r = sectionIndex; r < Math.min(values.length, sectionIndex + 6); r++) {
    const rowText = values[r].map(cell => String(cell).trim());

    if (rowText.includes(game)) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) return '';

  const headerRow = values[headerRowIndex].map(cell => String(cell).trim());
  const gameColumnIndex = headerRow.indexOf(game);

  if (gameColumnIndex === -1) return '';

  const valueRow = values[headerRowIndex + 1];

  if (!valueRow) return '';

  return valueRow[gameColumnIndex] || '';
}

function readGameInfoMap(ss) {
  const sheet = ss.getSheetByName(GAME_INFO_SHEET_NAME);

  if (!sheet) return {};

  const values = sheet.getDataRange().getDisplayValues();

  if (!values || values.length < 2) return {};

  const headerRowIndex = findGameInfoHeaderRow(values);

  if (headerRowIndex === -1) return {};

  const headers = values[headerRowIndex];

  const dayCol = findColumn(headers, ['day', 'dayid', '日']);
  const gameCol = findColumn(headers, ['game', 'gameid', '試合']);
  const startCol = findColumn(headers, ['start', 'starttime', '開始', '開始時間']);
  const endCol = findColumn(headers, ['end', 'endtime', '終了', '終了時間']);
  const banCol = findColumn(headers, ['ban', 'banlist', 'ban list', 'バン', 'banリスト']);
  const anomalyCol = findColumn(headers, ['anomaly', '異常']);

  if (dayCol === -1 || gameCol === -1) return {};

  const result = {};

  for (let r = headerRowIndex + 1; r < values.length; r++) {
    const row = values[r];

    const dayId = String(row[dayCol]).trim();
    const gameId = String(row[gameCol]).trim();

    if (!dayId || !gameId) continue;

    if (!result[dayId]) {
      result[dayId] = {};
    }

    result[dayId][gameId] = {
      startTime: startCol >= 0 ? String(row[startCol]).trim() : '',
      endTime: endCol >= 0 ? String(row[endCol]).trim() : '',
      ban: banCol >= 0 ? splitBanText(row[banCol]) : [],
      anomaly: anomalyCol >= 0 ? String(row[anomalyCol]).trim() : ''
    };
  }

  return result;
}

function findGameInfoHeaderRow(values) {
  for (let r = 0; r < values.length; r++) {
    const normalized = values[r].map(cell => normalizeHeader(cell));

    if (normalized.includes('day') && normalized.includes('game')) {
      return r;
    }
  }

  return -1;
}

function findColumn(headerRow, candidates) {
  const normalizedHeaders = headerRow.map(cell => normalizeHeader(cell));
  const normalizedCandidates = candidates.map(value => normalizeHeader(value));

  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (normalizedCandidates.includes(normalizedHeaders[i])) {
      return i;
    }
  }

  return -1;
}

function normalizeHeader(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/-/g, '');
}

function splitBanText(value) {
  const text = String(value || '').trim();

  if (!text) return [];

  return text
    .split(/[\n,、\/／・]+/)
    .map(item => item.trim())
    .filter(item => item !== '');
}

function splitDetailCell(value) {
  const text = String(value || '').trim();

  if (!text) return [];

  return text
    .split(/[\n,、\/／・]+/)
    .map(item => item.trim())
    .filter(item => item !== '');
}

function findHeaderRow(values, requiredLabels) {
  for (let r = 0; r < values.length; r++) {
    const rowText = values[r].map(cell => String(cell).trim());

    const hasAllLabels = requiredLabels.every(label => rowText.includes(label));

    if (hasAllLabels) {
      return r;
    }
  }

  return -1;
}

function findSectionRow(values, sectionNames) {
  const targets = sectionNames.map(name => String(name).trim().toLowerCase());

  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const cell = String(values[r][c]).trim().toLowerCase();

      if (targets.includes(cell)) {
        return r;
      }
    }
  }

  return -1;
}

function isSectionTitle(value) {
  const text = String(value).trim().toLowerCase();

  return [
    'placement',
    'total score',
    'data',
    'hero pick',
    'ban list',
    'comp',
    'lesser trinkets',
    'greater trinkets',
    'infomation',
    'information',
    'anomaly',
    'schedule'
  ].includes(text);
}

function uniqueNames(nameGroups) {
  const result = [];
  const seen = {};

  nameGroups.forEach(group => {
    group.forEach(name => {
      if (!seen[name]) {
        seen[name] = true;
        result.push(name);
      }
    });
  });

  return result;
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return '';

  const text = String(value).trim();

  if (text === '') return '';

  const num = Number(text);

  if (!Number.isNaN(num)) {
    return num;
  }

  return text;
}

function emptyTable(headers, errorMessage) {
  return {
    headers,
    rows: [],
    error: errorMessage
  };
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}