const SPREADSHEET_ID = '';

const DAY_SHEETS = [
  { sheetName: 'Day1', label: 'DAY1', date: '6/27' },
  { sheetName: 'Day2', label: 'DAY2', date: '7/4' },
  { sheetName: 'Day3', label: 'DAY3', date: '7/18' },
  { sheetName: 'Day4', label: 'DAY4', date: '7/25' }
];

const PLAYER_COUNT = 8;
const GAME_COUNT = 5;

const R = {
  pointsHeader: 12,
  pointsStart: 13,

  placementsHeader: 23,
  placementsStart: 24,

  heroStart: 45,

  banStart: 55,
  banEnd: 64,

  anomalyRow: 67,

  compStart: 70,

  lesser1Start: 80,
  lesser2Start: 90,

  greater1Start: 100,
  greater2Start: 110,

  infoStart: 120,

  startTimeRow: 130,
  endTimeRow: 131
};

const C = {
  name: 1,
  dailyTotal: 2,
  dailyRank: 3,
  gameStart: 4,

  leagueTotal: 9,
  leagueRank: 10
};

function doGet() {
  try {
    const data = buildSeason2Data_();

    return jsonResponse_(data);
  } catch (error) {
    return jsonResponse_({
      title: 'S級リーグS2',
      updatedAt: new Date().toISOString(),
      summary: {
        headers: [],
        rows: []
      },
      days: [],
      error: String(error && error.stack ? error.stack : error)
    });
  }
}

function buildSeason2Data_() {
  const ss = getSpreadsheet_();
  const dayTargets = getDayTargets_(ss);

  const days = dayTargets
    .map(target => parseDaySheet_(target.sheet, target.label, target.date))
    .filter(day => day && day.playerNames.length > 0);

  const summary = buildSummary_(days);

  days.forEach(day => {
    delete day.playerNames;
    delete day.leagueRows;
  });

  return {
    title: 'S級リーグS2',
    updatedAt: new Date().toISOString(),
    summary,
    days
  };
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim()) {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDayTargets_(ss) {
  const targets = [];

  DAY_SHEETS.forEach(config => {
    const sheet = findSheet_(ss, config.sheetName);

    if (sheet) {
      targets.push({
        sheet,
        label: config.label,
        date: config.date
      });
    }
  });

  if (targets.length > 0) {
    return targets;
  }

  const fallbackSheet = ss.getSheets()[0];

  return [
    {
      sheet: fallbackSheet,
      label: 'DAY1',
      date: ''
    }
  ];
}

function findSheet_(ss, name) {
  const sheets = ss.getSheets();
  const normalizedName = normalize_(name);

  let found = sheets.find(sheet => normalize_(sheet.getName()) === normalizedName);

  if (found) {
    return found;
  }

  found = sheets.find(sheet => normalize_(sheet.getName()).includes(normalizedName));

  return found || null;
}

function parseDaySheet_(sheet, label, date) {
  const games = readGameLabels_(sheet);
  const playerNames = readPlayerNames_(sheet);

  const dailyScoreRows = readDailyScoreRows_(sheet, playerNames, games);
  const pointRows = readPointRows_(sheet, playerNames, games);
  const placementRows = readPlacementRows_(sheet, playerNames, games);
  const leagueRows = readLeagueRows_(sheet, playerNames);
  const gameDetails = readGameDetails_(sheet, playerNames, games, placementRows);

  return {
    label,
    date,
    games,
    playerNames,
    leagueRows,

    dailyScore: {
      headers: [
        { label: 'Name', key: 'name' },
        { label: 'Daily Total', key: 'dailyTotal' },
        { label: '順位', key: 'rank' }
      ],
      rows: dailyScoreRows
    },

    points: {
      headers: [
        { label: 'Name', key: 'name' },
        { label: 'Daily Total', key: 'dailyTotal' },
        { label: '順位', key: 'rank' },
        ...games.map((game, index) => ({
          label: `game${index + 1}`,
          key: game
        }))
      ],
      rows: pointRows
    },

    placements: {
      headers: [
        { label: 'Name', key: 'name' },
        { label: '1st count', key: 'firstCount' },
        { label: 'average', key: 'average' },
        ...games.map((game, index) => ({
          label: `game${index + 1}`,
          key: game
        }))
      ],
      rows: placementRows
    },

    gameDetails
  };
}

function readGameLabels_(sheet) {
  const labels = sheet
    .getRange(R.pointsHeader, C.gameStart, 1, GAME_COUNT)
    .getDisplayValues()[0]
    .map((value, index) => clean_(value) || `game${index + 1}`);

  return labels;
}

function readPlayerNames_(sheet) {
  const namesFromPoints = sheet
    .getRange(R.pointsStart, C.name, PLAYER_COUNT, 1)
    .getDisplayValues()
    .map(row => clean_(row[0]))
    .filter(Boolean);

  if (namesFromPoints.length > 0) {
    return namesFromPoints;
  }

  return sheet
    .getRange(R.placementsStart, C.name, PLAYER_COUNT, 1)
    .getDisplayValues()
    .map(row => clean_(row[0]))
    .filter(Boolean);
}

function readDailyScoreRows_(sheet, playerNames, games) {
  const values = sheet
    .getRange(R.pointsStart, C.name, PLAYER_COUNT, C.dailyRank)
    .getDisplayValues();

  return playerNames.map((name, index) => {
    const row = values[index] || [];

    return {
      name,
      dailyTotal: numberOrText_(row[1]),
      rank: clean_(row[2])
    };
  });
}

function readPointRows_(sheet, playerNames, games) {
  const values = sheet
    .getRange(R.pointsStart, C.name, PLAYER_COUNT, C.gameStart + GAME_COUNT - 1)
    .getDisplayValues();

  return playerNames.map((name, playerIndex) => {
    const row = values[playerIndex] || [];

    const obj = {
      name,
      dailyTotal: numberOrText_(row[1]),
      rank: clean_(row[2])
    };

    games.forEach((game, gameIndex) => {
      obj[game] = numberOrText_(row[3 + gameIndex]);
    });

    return obj;
  });
}

function readPlacementRows_(sheet, playerNames, games) {
  const values = sheet
    .getRange(R.placementsStart, C.name, PLAYER_COUNT, C.gameStart + GAME_COUNT - 1)
    .getDisplayValues();

  return playerNames.map((name, playerIndex) => {
    const row = values[playerIndex] || [];

    const obj = {
      name,
      firstCount: numberOrText_(row[1]),
      average: numberOrText_(row[2])
    };

    games.forEach((game, gameIndex) => {
      obj[game] = numberOrText_(row[3 + gameIndex]);
    });

    return obj;
  });
}

function readLeagueRows_(sheet, playerNames) {
  const values = sheet
    .getRange(R.pointsStart, C.leagueTotal, PLAYER_COUNT, 2)
    .getDisplayValues();

  return playerNames.map((name, index) => {
    const row = values[index] || [];

    return {
      name,
      leagueTotal: numberOrText_(row[0]),
      rank: clean_(row[1])
    };
  });
}

function readGameDetails_(sheet, playerNames, games, placementRows) {
  const heroValues = readPlayerGameBlock_(sheet, R.heroStart);
  const compValues = readPlayerGameBlock_(sheet, R.compStart);
  const lesser1Values = readPlayerGameBlock_(sheet, R.lesser1Start);
  const lesser2Values = readPlayerGameBlock_(sheet, R.lesser2Start);
  const greater1Values = readPlayerGameBlock_(sheet, R.greater1Start);
  const greater2Values = readPlayerGameBlock_(sheet, R.greater2Start);
  const infoValues = readPlayerGameBlock_(sheet, R.infoStart);

  const startTimes = sheet
    .getRange(R.startTimeRow, C.gameStart, 1, GAME_COUNT)
    .getDisplayValues()[0]
    .map(clean_);

  const endTimes = sheet
    .getRange(R.endTimeRow, C.gameStart, 1, GAME_COUNT)
    .getDisplayValues()[0]
    .map(clean_);

  const anomalyValues = sheet
    .getRange(R.anomalyRow, C.gameStart, 1, GAME_COUNT)
    .getDisplayValues()[0]
    .map(clean_);

  return games.map((game, gameIndex) => {
    return {
      label: `GAME${gameIndex + 1}`,
      startTime: startTimes[gameIndex] || '',
      endTime: endTimes[gameIndex] || '',
      ban: readBanList_(sheet, gameIndex),
      anomaly: anomalyValues[gameIndex] || '',

      headers: [
        { label: 'Name', key: 'name' },
        { label: '順位', key: 'placement' },
        { label: 'HERO', key: 'hero' },
        { label: 'COMP', key: 'comp' },
        { label: 'Lesser 1', key: 'lesser1' },
        { label: 'Lesser 2', key: 'lesser2' },
        { label: 'Greater 1', key: 'greater1' },
        { label: 'Greater 2', key: 'greater2' },
        { label: 'Info', key: 'info' }
      ],

      rows: playerNames.map((name, playerIndex) => {
        return {
          name,
          placement: getGameValue_(placementRows[playerIndex], game),
          hero: getBlockValue_(heroValues, playerIndex, gameIndex),
          comp: getBlockValue_(compValues, playerIndex, gameIndex),
          lesser1: getBlockValue_(lesser1Values, playerIndex, gameIndex),
          lesser2: getBlockValue_(lesser2Values, playerIndex, gameIndex),
          greater1: getBlockValue_(greater1Values, playerIndex, gameIndex),
          greater2: getBlockValue_(greater2Values, playerIndex, gameIndex),
          info: getBlockValue_(infoValues, playerIndex, gameIndex)
        };
      })
    };
  });
}

function readPlayerGameBlock_(sheet, startRow) {
  return sheet
    .getRange(startRow, C.gameStart, PLAYER_COUNT, GAME_COUNT)
    .getDisplayValues()
    .map(row => row.map(clean_));
}

function readBanList_(sheet, gameIndex) {
  const col = C.gameStart + gameIndex;
  const count = R.banEnd - R.banStart + 1;

  return sheet
    .getRange(R.banStart, col, count, 1)
    .getDisplayValues()
    .map(row => clean_(row[0]))
    .filter(Boolean);
}

function buildSummary_(days) {
  const sourceDay = [...days].reverse().find(day => {
    return day.leagueRows.some(row => {
      return row.leagueTotal !== '' || row.rank !== '';
    });
  });

  const rows = sourceDay ? sourceDay.leagueRows : [];

  return {
    headers: [
      { label: 'Name', key: 'name' },
      { label: 'League Total', key: 'leagueTotal' },
      { label: '順位', key: 'rank' }
    ],
    rows
  };
}

function getGameValue_(row, game) {
  if (!row || !game) {
    return '';
  }

  return row[game] === undefined || row[game] === null ? '' : row[game];
}

function getBlockValue_(block, rowIndex, colIndex) {
  if (!block || !block[rowIndex]) {
    return '';
  }

  return block[rowIndex][colIndex] || '';
}

function clean_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value).trim();

  if (
    text === '#DIV/0!' ||
    text === '#VALUE!' ||
    text === '#N/A' ||
    text === '#REF!' ||
    text === '#ERROR!'
  ) {
    return '';
  }

  return text;
}

function numberOrText_(value) {
  const text = clean_(value);

  if (!text) {
    return '';
  }

  const normalized = text.replace(/,/g, '');
  const number = Number(normalized);

  if (/^-?\d+(\.\d+)?$/.test(normalized) && Number.isFinite(number)) {
    return number;
  }

  return text;
}

function normalize_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
