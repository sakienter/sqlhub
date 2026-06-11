// S2の種族情報はスプレッドシートの色ではなく、このファイルで手動管理します。
// 書き方：DAYごと、GAMEごとに「登場種族」と「非登場種族」を配列で指定します。
// 例：available: ['アンデッド', 'エレメンタル'], unavailable: ['マーロック', 'メカ']

window.SEASON2_TRIBE_CONFIG = {
  DAY1: {
    GAME1: {
      available: [],
      unavailable: []
    },
    GAME2: {
      available: [],
      unavailable: []
    },
    GAME3: {
      available: [],
      unavailable: []
    },
    GAME4: {
      available: [],
      unavailable: []
    },
    GAME5: {
      available: [],
      unavailable: []
    }
  },
  DAY2: {
    GAME1: { available: [], unavailable: [] },
    GAME2: { available: [], unavailable: [] },
    GAME3: { available: [], unavailable: [] },
    GAME4: { available: [], unavailable: [] },
    GAME5: { available: [], unavailable: [] }
  },
  DAY3: {
    GAME1: { available: [], unavailable: [] },
    GAME2: { available: [], unavailable: [] },
    GAME3: { available: [], unavailable: [] },
    GAME4: { available: [], unavailable: [] },
    GAME5: { available: [], unavailable: [] }
  },
  DAY4: {
    GAME1: { available: [], unavailable: [] },
    GAME2: { available: [], unavailable: [] },
    GAME3: { available: [], unavailable: [] },
    GAME4: { available: [], unavailable: [] },
    GAME5: { available: [], unavailable: [] }
  }
};
