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
      GAME5: { available: byIndex(2, 4, 5, 6, 9), unavailable: byIndex(0, 1, 3, 7, 8) }
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
      lesser1: ['末魔の魂壺（バズり虫）', '使い古された燭台（レイ）', '土産物店', '飾り時計', 'くたびれた地図'],
      lesser2: ['', '', 'バーテンド・トロンのオイル缶', '', ''],
      greater1: ['私掠船員の肖像画', 'ボブのチップ入れビン', '戦団の笛', 'スカイ・ゴーレムの肖像画', 'なし'],
      greater2: ['', '', '私掠船員の肖像画', '', '書記型タイプライター'],
      info: ['HP＝コドー', 'HP=エリーズ', '', '', '終わらない詠唱(10体死亡)']
    },
    Barrette: {
      comp: ['背中合わせ', 'ラスガAPM', 'ラスガAPM', '融合体ケンゴー', 'メカ'],
      lesser1: ['メディヴの書', 'クロマティック・ティア', '書記型タイプライター', '旅行クーポン', '探検家の双眼鏡'],
      lesser2: ['', '', 'フェレメンタルの肖像画', '', ''],
      greater1: ['無貌の肖像画', 'ボブのチップ入れビン', 'カラフルコンパス（悪魔）', 'キュレーターのステッカー', '穢れし秘本'],
      greater2: ['', '', '書記型タイプライター', '未知のオーブ→詩竜の肖像画', 'ボブのチップ入れビン'],
      info: ['', '', '', 'HP＝ネズミの王\nTw/アーマー&プリズムスケール', '']
    },
    haguren: {
      comp: ['バッカニーア', 'ドラスト海賊', 'メカ', '発明家', '発明家'],
      lesser1: ['ブーティ・ベイ・ビール', '満杯コイン財布', '海底のイカリ', '書記型タイプライター', '子安貝の首飾り'],
      lesser2: ['', '', 'くたびれた地図', '', ''],
      greater1: ['保全パッチ', '私掠船員の肖像画', '万華鏡（サンダース船長）', 'メカ・ジャラクサスのステッカー', 'カラフルコンパス（メカ）'],
      greater2: ['', '', '金メッキの羅針盤（メカ）', '', 'モルグルの肖像画'],
      info: ['', '', '', '', '']
    },
    MATSURI: {
      comp: ['ファミリーマーロック', 'ラスガAPM', '恵APM', '溢れアンデッド', '女王ライラク'],
      lesser1: ['ゴブリンの財布', '謎めいた立方体', '陣太鼓', '書記型タイプライター', '書記型タイプライター'],
      lesser2: ['', '', '探検家の双眼鏡', '', ''],
      greater1: ['ナァグル語の常用会話集', '未知のオーブ→サメキャノン', '穢れし秘本', '書記型タイプライター', 'ボブのチップ入れビン'],
      greater2: ['大きくなれよマーク・アイのステッカー', '', '金メッキの羅針盤（ドラゴン）', '', '道を照らすロウソク'],
      info: ['', '', '', '', '']
    },
    Thundurus: {
      comp: ['混成＋毒', 'バッカニーア', 'ラスガAPM', 'キルボア→チャームチェンジ', 'カレク'],
      lesser1: ['飾り時計', 'バーテンド・トロンのオイル缶', '満杯コイン財布', '謎めいたオーブ', '魔法使いのシルクハット'],
      lesser2: ['', '', '探検家の双眼鏡', '陣太鼓', ''],
      greater1: ['カラフルコンパス（獣）', '戦団の笛', '無貌の肖像画', '下級', 'クロマティック・ティア'],
      greater2: ['', '', 'チルメアモザイク', '', '書記型タイプライター'],
      info: ['', '', '', '', 'HP＝ゲイルウィング']
    },
    'ぎゃん': {
      comp: ['バッカニーア', 'スカイゴーレム', '恵エヴォーカー', '混成＋ドラゴン', '発明家'],
      lesser1: ['金のペンダント', '書記型タイプライター', '反射のペンダント', '使い古された燭台', 'スクレーパーのステッカー'],
      lesser2: ['', '', '探検家の双眼鏡', '', ''],
      greater1: ['サメキャノン', '酒場のオヤジの炉端（指輪、スカイゴーレム）', '詩竜の肖像画', 'チルメアモザイク', '戦団の笛'],
      greater2: ['', '', '戦団の笛', '', '罪石のステッカー'],
      info: ['', '', '', '燭台（密輸人）', '']
    },
    masa007: {
      comp: ['背中合わせ', 'スカイブレーザー', '自動人形', 'キルボア', '融合体ケンゴー'],
      lesser1: ['使い古された燭台', 'ロックのオルゴール', '土産物店', 'ゴブリンの財布', '満杯コイン財布'],
      lesser2: ['', '', 'ゴブリンの財布', '', ''],
      greater1: ['保全パッチ', 'なし', '金メッキの羅針盤（メカ）', '血のアミュレット', '詩竜の肖像画'],
      greater2: ['', '', '書記型タイプライター', '', 'キュレーターのステッカー'],
      info: ['燭台（時渡の船頭）', '', '', '', '']
    },
    Reverent: {
      comp: ['マーロック', 'ヒョウシマーモス', '背中合わせ', '溢れアンデッド', 'ライラククランカー'],
      lesser1: ['探検家の双眼鏡', '光る篭手', 'レンドルのステッカー', 'レンズケース', 'ライラクの肖像画'],
      lesser2: ['', '', '海底のイカリ', '', ''],
      greater1: ['キュレーターのステッカー', '無謀の肖像画', '金メッキの羅針盤（海賊）', 'スカイ・ゴーレムの肖像画', 'ブームの怪発明の肖像画'],
      greater2: ['', '', 'ボブのチップ入れビン', '', '書記型タイプライター'],
      info: ['', '', '', '', '']
    }
  };

  day.gameDetails.forEach((game, gameIndex) => {
    (game.rows || []).forEach(row => {
      const player = corrections[row?.name];
      if (!player) return;
      row.comp = player.comp[gameIndex];
      row.lesser1 = player.lesser1[gameIndex];
      row.lesser2 = player.lesser2[gameIndex];
      row.greater1 = player.greater1[gameIndex];
      row.greater2 = player.greater2[gameIndex];
      row.info = player.info[gameIndex];
    });
  });
}

async function initSeasonTwo() {
  loadedData = createFallbackData();
  renderPage(loadedData);
  keepCompositionPlaceholderCurrent();

  const [resultData, day2Data, day3Data, day4Data, staticTribes] = await Promise.all([
    fetchJson(API_URL).catch(error => {
      console.warn('Season 2 static results are not available.', error);
      return null;
    }),
    fetchJson('./results-day2.json').catch(error => {
      console.warn('Season 2 DAY2 results are not available.', error);
      return null;
    }),
    fetchJson('./results-day3.json').catch(error => {
      console.warn('Season 2 DAY3 results are not available.', error);
      return null;
    }),
    fetchJson('./results-day4.json?v=20260725-final').catch(error => {
      console.warn('Season 2 DAY4 results are not available.', error);
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
    const dayTwoPatchedData = applySeasonPatch(resultData, day2Data, 1);
    const dayThreePatchedData = applySeasonPatch(dayTwoPatchedData, day3Data, 2);
    const patchedData = applySeasonPatch(dayThreePatchedData, day4Data, 3);
    applyDayTwoGameFourHeroNames(patchedData);
    applyDayTwoTerminology(patchedData);
    loadedData = normalizeSeasonData(patchedData);
  }

  renderPage(loadedData, true);
}

initSeasonTwo();
