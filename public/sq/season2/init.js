function keepCompositionPlaceholderCurrent() {
  const placeholder = document.getElementById('composition-placeholder');
  const tableBody = document.querySelector('#day-points-table tbody');
  if (!placeholder || !tableBody) return;

  const update = () => {
    const hasPlayers = tableBody.querySelectorAll('tr').length > 0;
    if (!hasPlayers && placeholder.textContent !== '未実施') {
      placeholder.textContent = '未実施';
    }
  };

  update();
  new MutationObserver(update).observe(tableBody, { childList: true, subtree: true });
  new MutationObserver(update).observe(placeholder, { childList: true, characterData: true, subtree: true });
  document.getElementById('composition-gallery')?.addEventListener('toggle', () => {
    window.setTimeout(update, 80);
  });
}

function applySeasonPatch(baseData, patchData, dayIndex) {
  if (!baseData || !patchData || typeof patchData !== 'object') return baseData;

  const merged = {
    ...baseData,
    days: Array.isArray(baseData.days) ? [...baseData.days] : []
  };

  if (patchData.updatedAt) merged.updatedAt = patchData.updatedAt;
  if (patchData.summary && typeof patchData.summary === 'object') merged.summary = patchData.summary;
  if (patchData.day && typeof patchData.day === 'object') merged.days[dayIndex] = patchData.day;

  return merged;
}

function applyDayTwoTribeConfig() {
  const byIndex = (...indexes) => indexes.map(index => S2_TRIBES[index]?.name).filter(Boolean);
  tribeConfig = {
    ...(tribeConfig || {}),
    DAY2: {
      GAME1: { available: byIndex(3, 4, 5, 8, 9), unavailable: byIndex(0, 1, 2, 6, 7) },
      GAME2: { available: byIndex(2, 6, 7, 8, 9), unavailable: byIndex(0, 1, 3, 4, 5) },
      GAME3: { available: byIndex(2, 3, 6, 7, 8), unavailable: byIndex(0, 1, 4, 5, 9) },
      GAME4: { available: byIndex(0, 2, 3, 5, 6), unavailable: byIndex(1, 4, 7, 8, 9) },
      GAME5: { available: byIndex(2, 3, 4, 5, 9), unavailable: byIndex(0, 1, 6, 7, 8) }
    }
  };
}

function applyDayTwoGameFourHeroNames(data) {
  const rows = data?.days?.[1]?.gameDetails?.[3]?.rows;
  if (!Array.isArray(rows)) return;

  const heroes = {
    Alutemu: 'スニード/ピンゾロ',
    Barrette: 'フィンレー/ムロゾンド',
    haguren: 'ザイレラ/クラッグ',
    MATSURI: 'テロン/テス',
    Thundurus: 'ゼレク/スニード',
    'ぎゃん': 'タヴィッシュ/ガリー',
    masa007: 'リッチキング/ワグトグル',
    Reverent: 'ユードラ/ガリー'
  };

  rows.forEach(row => {
    if (heroes[row?.name]) row.hero = heroes[row.name];
  });
}

function applyDayTwoTerminology(data) {
  const day = data?.days?.[1];
  if (!Array.isArray(day?.gameDetails)) return;

  const corrections = {
    Alutemu: {
      comp: ['コドー構成', 'ドラスト海賊', 'ナラァ＋タガワック', 'スカイゴーレム＆背中合わせ', 'ナーガ'],
      lesser1: ['末魔の魂壺（バズり虫）', '使い古された燭台（レイ）', '土産物店', '飾り時計', 'くたびれた地図']
    },
    Barrette: {
      comp: ['背中合わせ', 'ラスガAPM', 'ラスガAPM', '融合体ケンゴー', 'メカ'],
      lesser1: ['メディヴの書', 'クロマティック・ティア', '書記型タイプライター', '旅行クーポン', '探検家の双眼鏡']
    },
    haguren: {
      comp: ['バッカニーア', 'ドラスト海賊', 'メカ', '発明家', '発明家'],
      lesser1: ['ブーティ・ベイ・ビール', '満杯コイン財布', '海底のイカリ', '書記型タイプライター', '子安貝の首飾り']
    },
    MATSURI: {
      comp: ['ファミリーマーロック', 'ラスガAPM', '恵APM', '溢れアンデッド', '女王ライラク'],
      lesser1: ['ゴブリンの財布', '謎めいた立方体', '陣太鼓', '書記型タイプライター', '書記型タイプライター']
    },
    Thundurus: {
      comp: ['混成＋毒', 'バッカニーア', 'ラスガAPM', 'キルボア→チャームチェンジ', 'カレク'],
      lesser1: ['飾り時計', 'バーテンド・トロンのオイル缶', '満杯コイン財布', '謎めいたオーブ', '魔法使いのシルクハット']
    },
    'ぎゃん': {
      comp: ['バッカニーア', 'スカイゴーレム', '恵エヴォーカー', '混成＋ドラゴン', '発明家'],
      lesser1: ['金のペンダント', '書記型タイプライター', '反射のペンダント', '使い古された燭台', 'スクレーパーのステッカー']
    },
    masa007: {
      comp: ['背中合わせ', 'スカイブレーザー', '自動人形', 'キルボア', '融合体ケンゴー'],
      lesser1: ['使い古された燭台', 'ロックのオルゴール', '土産物店', 'ゴブリンの財布', '満杯コイン財布']
    },
    Reverent: {
      comp: ['マーロック', 'ヒョウシマーモス', '背中合わせ', '溢れアンデッド', 'ライラククランカー'],
      lesser1: ['探検家の双眼鏡', '光る篭手', 'レンドルのステッカー', 'レンズケース', 'ライラクの肖像画']
    }
  };

  day.gameDetails.forEach((game, gameIndex) => {
    (game.rows || []).forEach(row => {
      const player = corrections[row?.name];
      if (!player) return;
      row.comp = player.comp[gameIndex];
      row.lesser1 = player.lesser1[gameIndex];
    });
  });
}

async function initSeasonTwo() {
  loadedData = createFallbackData();
  renderPage(loadedData);
  keepCompositionPlaceholderCurrent();

  const [resultData, day2Data, staticTribes] = await Promise.all([
    fetchJson(API_URL).catch(error => {
      console.warn('Season 2 static results are not available.', error);
      return null;
    }),
    fetchJson('./results-day2.json').catch(error => {
      console.warn('Season 2 DAY2 results are not available.', error);
      return null;
    }),
    fetchJson(TRIBE_API_URL).catch(error => {
      console.warn('Season 2 static tribe data is not available.', error);
      return null;
    })
  ]);

  if (staticTribes && typeof staticTribes === 'object') {
    tribeConfig = staticTribes;
  }
  applyDayTwoTribeConfig();

  if (resultData && typeof resultData === 'object') {
    const patchedData = applySeasonPatch(resultData, day2Data, 1);
    applyDayTwoGameFourHeroNames(patchedData);
    applyDayTwoTerminology(patchedData);
    loadedData = normalizeSeasonData(patchedData);
  }

  renderPage(loadedData, true);
}

initSeasonTwo();
