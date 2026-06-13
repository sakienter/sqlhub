# Avenge Hub

Avenge Hub は、Stuntdrake が運営・協力する Hearthstone Battlegrounds 関連大会の情報整理サイトです。

S級リーグの試合結果・ポイント状況、過去大会のアーカイブ、別母体大会、スクリムの情報を掲載しています。公開環境は Cloudflare Pages、公開ディレクトリは `public` です。

最終更新: 2026年6月14日

## 2026年6月14日の主な更新

- 公開URLを `/sq/`、`/tournaments/`、`/scrims/` 配下へ整理し、旧URLからの301転送と共有資産の内部書き換えを追加
- S級リーグ各ページ、管理画面、トップページのリンクとCSS・画像・JavaScript参照をルート基準のパスへ修正
- トップページの大会カードに開催時期を追加し、見出し、About / Contact、スクリム導線を整理
- Season 2 のメイン表示を日本時間の日付に応じて「開幕前」「開催中」「終了後」へ自動切り替え
- 時渡りドリームマッチ、バトグラ【裏】頂上戦、バトグラ頂上戦、バトグラ最強決定戦2026などのヘッダーと大会説明を調整
- バトグラ最強決定戦2026を完全招待制のオフライン大会、バトグラ【裏】頂上戦を招待制大会として明記
- CN vs JP のスプレッドシートリンク、CN vs Worlds の表レイアウト、各大会ページのテキスト表示を修正
- スクリムの過去ロビーカード全体をスプレッドシートへのリンクにし、管理画面への導線を控えめな `+` 表示へ変更
- 全ページのフッターにページ単位の最終更新日と注意書きを表示し、GitHub Actionsで自動更新する仕組みを追加
- `sutantic.png` を全ページ共通のサイトアイコンとして設定

## 公開URL

| パス | 内容 |
|---|---|
| `/` | Avenge Hub トップページ |
| `/sq/season1/` | S級リーグ Season 1 |
| `/sq/season2/` | S級リーグ Season 2 |
| `/tournaments/twdm/` | 時渡りドリームマッチ |
| `/tournaments/uratop/` | バトグラ【裏】頂上戦 |
| `/tournaments/topseries/` | バトグラ頂上戦 #1〜#9 |
| `/tournaments/saikyo2026/` | バトグラ最強決定戦2026 |
| `/tournaments/deepblue/` | ディープ・ブルー杯 |
| `/tournaments/reno/` | レノ・ジャクソン杯 |
| `/tournaments/cn-vs-worlds/` | CN vs Worlds |
| `/tournaments/cn-vs-jp/` | CN vs JP |
| `/scrims/` | 練習会・スクリム |

旧URLは `public/_redirects` で新URLへ301転送します。

## ディレクトリ構成

```txt
sqlhub/
├── README.md
├── .github/
│   ├── PAGE_DATE_AUTOMATION.md
│   ├── scripts/
│   │   └── update_page_dates.py
│   └── workflows/
│       └── update-page-dates.yml
├── public/
│   ├── index.html
│   ├── _redirects
│   ├── common.css
│   ├── common-base.css
│   ├── common-overrides.css
│   ├── home.css
│   ├── season-banner.js
│   ├── footer-updated.css
│   ├── sutantic.png
│   ├── admin-tribes.css
│   ├── composition-gallery.css
│   ├── composition-gallery.js
│   ├── tribewebp/
│   ├── sq/
│   │   ├── season1/
│   │   │   ├── index.html
│   │   │   ├── style.css
│   │   │   ├── script.js
│   │   │   ├── cache-helper.js
│   │   │   ├── tribes-display.js
│   │   │   ├── results.json
│   │   │   ├── tribes.json
│   │   │   ├── admin/
│   │   │   └── s1.webp
│   │   └── season2/
│   │       ├── index.html
│   │       ├── style.css
│   │       ├── data.js
│   │       ├── summary.js
│   │       ├── render.js
│   │       ├── init.js
│   │       ├── results.css
│   │       ├── results.json
│   │       ├── tribes.json
│   │       ├── admin/
│   │       └── S2.webp
│   ├── season1/
│   │   ├── archive/
│   │   └── s1day1/ ... s1day4/
│   ├── season2/
│   │   ├── compositions/
│   │   └── S2.webp
│   ├── tournaments/
│   │   ├── twdm/
│   │   ├── uratop/
│   │   ├── topseries/
│   │   ├── saikyo2026/
│   │   ├── deepblue/
│   │   ├── reno/
│   │   ├── cn-vs-worlds/
│   │   └── cn-vs-jp/
│   └── scrims/
└── functions/
    └── api/
```

`public/season1/` と `public/season2/` に残るファイルは、大容量の構成画像やアーカイブJSONを保管する互換資産です。公開ページ本体は `public/sq/` 以下にあります。

## Season 1

Season 1 は終了済みのアーカイブページです。

主なファイル:

- ページ: `public/sq/season1/index.html`
- 表示処理: `public/sq/season1/script.js`
- 静的データ読込: `public/sq/season1/cache-helper.js`
- 基本結果: `public/sq/season1/results.json`
- 種族設定: `public/sq/season1/tribes.json`
- DAY別アーカイブ: `public/season1/archive/`
- 構成画像: `public/season1/s1day1/` から `s1day4/`

`cache-helper.js` が静的アーカイブを読み込み、結果ページへ渡します。旧資産フォルダは `_redirects` の内部書き換えで新URLから参照します。

## Season 2

Season 2 はリポジトリ内の静的JSONで管理します。

主なファイル:

- ページ: `public/sq/season2/index.html`
- 結果データ: `public/sq/season2/results.json`
- 種族データ: `public/sq/season2/tribes.json`
- データ定義・正規化: `public/sq/season2/data.js`
- 総合順位処理: `public/sq/season2/summary.js`
- 表・タブ描画: `public/sq/season2/render.js`
- 初期化: `public/sq/season2/init.js`
- 構成画像: `public/season2/compositions/`

未入力の結果は「未実施」と表示されます。

### `results.json` の基本構造

```json
{
  "title": "S級リーグS2",
  "updatedAt": "",
  "summary": {
    "rows": []
  },
  "days": [
    {
      "label": "DAY1",
      "date": "6/27",
      "points": { "rows": [] },
      "placements": { "rows": [] },
      "gameDetails": [
        {
          "label": "GAME1",
          "startTime": "",
          "endTime": "",
          "anomaly": "",
          "rows": []
        }
      ]
    }
  ]
}
```

### ゲーム別詳細の行

```json
{
  "name": "Player Name",
  "placement": 1,
  "hero": "ヒーロー名",
  "comp": "構成名",
  "lesser1": "装飾品名",
  "lesser2": "",
  "greater1": "装飾品名",
  "greater2": "",
  "info": "補足"
}
```

### 種族データ

`public/sq/season2/tribes.json` を編集します。

```json
{
  "DAY1": {
    "GAME1": {
      "available": ["アンデッド", "マーロック", "海賊", "獣", "キルボア"],
      "unavailable": ["エレメンタル", "ドラゴン", "ナーガ", "メカ", "悪魔"]
    }
  }
}
```

使用する種族名:

- アンデッド
- エレメンタル
- ドラゴン
- キルボア
- ナーガ
- マーロック
- メカ
- 悪魔
- 海賊
- 獣

## トップページの更新

トップページは `public/index.html`、専用スタイルは `public/home.css` です。

主な管理対象:

- 開催中シーズンへのリンク
- S級リーグのカード
- Past Tournaments
- スクリム
- About / Contact
- バナー画像と表示位置

内部リンクには現行の公開URLを使用してください。

### Season 2 メイン表示の自動切り替え

`public/season-banner.js` が `Asia/Tokyo` の日付を参照し、トップページのSeason 2表示を自動で変更します。

| 期間 | 表示状態 |
|---|---|
| 2026年6月26日まで | 開幕予定 |
| 2026年6月27日〜7月25日 | 開催中 |
| 2026年7月26日以降 | 結果・アーカイブ |

開催期間を変更する場合は、`openingDay` と `finalDay` を同時に更新してください。

## ページ最終更新日の自動反映

全ページの共通フッターは次の形式です。

```html
<footer class="footer-note" data-page-updated="2026-06-14">
  <p>Stuntdrake's Avenge! / Tournament info by Stuntdrake</p>
  <p class="footer-updated">最終更新：<time datetime="2026-06-14">2026年6月14日</time></p>
  <p class="footer-update-note">※更新日はページの一部修正を含みます。</p>
</footer>
```

`main` へのpush後、`.github/workflows/update-page-dates.yml` が変更ファイルを取得し、`.github/scripts/update_page_dates.py` を実行します。

自動更新の対象:

- HTML本体が変更されたページ
- ページ配下のCSS・JavaScript・JSON・画像などが変更されたページ
- 変更された共有資産を参照するページ
- 従来形式のフッターが残っているページ

日付は `Asia/Tokyo` で生成されます。生成結果に差分がある場合、GitHub Actionsが `chore: update page dates [skip ci]` というコミットを作成します。

フッターの表示スタイルは `public/footer-updated.css` で管理します。

## サイトアイコン

全HTMLページは、次の共通faviconを使用します。

```html
<link rel="icon" href="/sutantic.png" type="image/png" />
```

画像ファイルは `public/sutantic.png` です。最終更新日の自動処理は、既存のfavicon指定を整理してこの設定へ統一します。

## URL変更と互換性

URLルールは `public/_redirects` で管理します。

- 旧ページURLは新URLへ `301` 転送
- 末尾スラッシュなしのURLを正規URLへ統一
- 移動していない大容量資産は `200` の内部書き換えで参照
- `/sq/` へのアクセスはSeason 2へ案内

ページ本体を移動する場合は、トップページ、各ページの戻るリンク、画像・CSS・JavaScriptの相対パス、管理画面、READMEを同時に確認してください。

## Cloudflare Pages

| 項目 | 設定値 |
|---|---|
| Build command | 空欄、または未設定 |
| Build output directory | `public` |
| Functions directory | `functions` |

S1の旧API互換処理や管理画面用のFunctionsが `functions/api/` に残っています。公開結果ページは静的データを優先して表示します。

## 更新時の確認項目

1. JSONが正しい形式であること
2. JavaScriptとPythonに構文エラーがないこと
3. HTML内の相対パスまたはルート基準パスが公開階層と一致すること
4. トップページのカードが現行URLを参照していること
5. 旧URLが新URLへ転送されること
6. 構成画像・バナー画像・種族アイコン・faviconが表示されること
7. 管理画面から公開ページへ戻れること
8. Season 2の表示状態が日本時間の日付に応じて正しく切り替わること
9. 変更したページの最終更新日がGitHub Actionsで更新されること
10. フッターの注意書きが全ページで統一されていること
