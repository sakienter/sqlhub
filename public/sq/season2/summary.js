function normalizeSeasonData(data) {
  const fallback = createFallbackData();
  const source = data && typeof data === 'object' ? data : {};
  const sourceDays = Array.isArray(source.days) ? source.days : [];
  const days = fallback.days.map((fallbackDay, index) => normalizeDay(sourceDays[index], fallbackDay));
  const rawSummary = normalizeTableData(source.summary, SUMMARY_HEADERS);

  return {
    ...fallback,
    title: source.title || fallback.title,
    updatedAt: source.updatedAt || '',
    summary: buildCompactSummary(rawSummary, days),
    days
  };
}

function buildCompactSummary(rawSummary, days) {
  const players = new Map();

  const ensurePlayer = name => {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) return null;
    if (!players.has(normalizedName)) {
      players.set(normalizedName, {
        name: normalizedName,
        rank: '',
        day1: '未実施',
        day2: '未実施',
        day3: '未実施',
        day4: '未実施',
        total: null
      });
    }
    return players.get(normalizedName);
  };

  (rawSummary?.rows || []).forEach(row => {
    const player = ensurePlayer(row?.name);
    if (!player) return;
    player.rank = row.rank || row.ptRank || row.finalRank || '';
    const total = firstNumber(row.total, row.leagueTotal, row.point);
    if (total !== null) player.total = total;
  });

  days.forEach((day, dayIndex) => {
    (day.points?.rows || []).forEach(row => {
      const player = ensurePlayer(row?.name);
      if (!player) return;
      const daily = firstNumber(row.dailyTotal, row.point, row.total);
      if (daily !== null) player[`day${dayIndex + 1}`] = daily;
    });
  });

  const rows = Array.from(players.values()).map(player => {
    const dayValues = [player.day1, player.day2, player.day3, player.day4];
    const scoredDays = dayValues.filter(value => typeof value === 'number');
    const calculatedTotal = scoredDays.reduce((sum, value) => sum + value, 0);
    return {
      ...player,
      total: player.total === null
        ? (scoredDays.length > 0 ? calculatedTotal : null)
        : player.total
    };
  });

  rows.sort((a, b) => {
    const rankA = rankNumber(a.rank);
    const rankB = rankNumber(b.rank);
    if (rankA && rankB) return rankA - rankB;
    if (rankA) return -1;
    if (rankB) return 1;

    const hasTotalA = typeof a.total === 'number';
    const hasTotalB = typeof b.total === 'number';
    if (hasTotalA && hasTotalB) return b.total - a.total;
    if (hasTotalA) return -1;
    if (hasTotalB) return 1;
    return 0;
  });

  rows.forEach((row, index) => {
    if (!row.rank && typeof row.total === 'number') row.rank = ordinal(index + 1);
  });

  return { headers: SUMMARY_HEADERS, rows };
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === '' || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function rankNumber(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}
