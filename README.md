# Avenge Hub

Avenge Hub は、Stuntdrake が運営・協力する Hearthstone Battlegrounds 関連大会の情報整理サイトです。

主な用途は、S級リーグの試合結果・ポイント状況の公開、過去大会のアーカイブ、別母体大会の情報整理です。Cloudflare Pages で公開し、S級リーグの結果データは Cloudflare Pages Functions 経由で Apps Script / Google Sheets から取得します。

## 現在の構成

```txt
sqlhub/
├── README.md
├── public/
│   ├── index.html                    # Avenge Hub トップページ
│   ├── common.css                    # サイト共通スタイル
│   ├── sutant.webp                   # トップページ用ヘッダー画像
│   ├── season1/
│   │   ├── index.html                # S級リーグ Season 1 結果ページ
│   │   ├── style.css
│   │   ├── script.js                 # S1 結果表示ロジック
│   │   ├── cache-helper.js           # S1 表示キャッシュ補助
│   │   ├── tribes-display.js         # S1 登場/非登場種族表示
│   │   └── *.webp                    # S1 用画像
│   ├── season2/
│   │   ├── index.html                # S級リーグ Season 2 結果ページ
│   │   ├── style.css
│   │   ├── script.js                 # S2 結果表示ロジック
│   │   └── *.webp                    # S2 用画像
│   └── tournaments/
│       ├── timewalk-dream-match/     # 時渡りドリームマッチ
│       ├── ura-choujousen/           # バトグラ【裏】頂上戦
│       ├── choujousen/               # バトグラ頂上戦 #1〜#9
│       ├── saikyo2026/               # バトグラ最強決定戦2026
│       ├── deepblue/                 # ディープ・ブルー杯
│       ├── renoj/                    # レノ・ジャクソン杯
│       └── *.webp                    # 大会バナー・ヘッダー画像
└── functions/
    └── api/
        ├── results.js                # S1 結果APIプロキシ
        ├── season1/
        │   └── tribes.js             # S1 種族設定API
        └── season2/
            ├── results.js            # S2 結果APIプロキシ
            └── tribes.js             # S2 種族設定API
```

## ページ一覧

| パス | 内容 |
|---|---|
| `/` | Avenge Hub トップ。開催中シーズン、News、S級リーグ、Past Tournaments、About me を表示します。 |
| `/season1/` | S級リーグ Season 1 の総合結果、DAY別結果、ゲーム別詳細を表示します。 |
| `/season2/` | S級リーグ Season 2 の総合結果、DAY別結果、ゲーム別詳細を表示します。 |
| `/tournaments/timewalk-dream-match/` | 時渡りドリームマッチのルール、最終結果、試合詳細、アーカイブを表示します。 |
| `/tournaments/ura-choujousen/` | バトグラ【裏】頂上戦の概要、出場選手、最終結果、DAY別結果を表示します。 |
| `/tournaments/choujousen/` | バトグラ頂上戦 #1〜#9 のまとめページです。 |
| `/tournaments/saikyo2026/` | バトグラ最強決定戦2026 の情報ページです。 |
| `/tournaments/deepblue/` | ディープ・ブルー杯の概要、ルール、Tonamelリンクを表示します。 |
| `/tournaments/renoj/` | レノ・ジャクソン杯の概要、ルール、Tonamelリンクを表示します。 |

## データ取得の仕組み

### S級リーグ Season 1

- フロント側: `public/season1/script.js`
- API: `/api/results`
- Pages Function: `functions/api/results.js`
- 必要な環境変数: `GAS_URL`

`GAS_URL` に指定した Apps Script の JSON エンドポイントから、S1 の総合順位、DAY別結果、ゲーム別詳細を取得します。

S1 は表示速度改善のため、`cache-helper.js` でブラウザ側の localStorage キャッシュを利用します。Cloudflare 側でも Pages Function のレスポンスにキャッシュヘッダーを付与しています。

### S級リーグ Season 2

- フロント側: `public/season2/script.js`
- API: `/api/season2/results`
- Pages Function: `functions/api/season2/results.js`
- 必要な環境変数: `GAS_URL_S2`

`GAS_URL_S2` に指定した Apps Script の JSON エンドポイントから、S2 の総合順位、DAY別結果、ゲーム別詳細を取得します。

S2 はブラウザ側で短時間の localStorage キャッシュを持ち、初回表示・更新直後の待ち時間を軽減します。

### 登場種族・非登場種族

- S1: `/api/season1/tribes`
- S2: `/api/season2/tribes`
- KV binding: `TRIBE_CONFIG`
- KV key:
  - `season1-tribes`
  - `season2-tribes`

`TRIBE_CONFIG` が未設定、または対象キーが存在しない場合は、`DAY1`〜`DAY4` の空設定を返します。

想定する JSON 形式は以下です。

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

## Cloudflare Pages 設定

Cloudflare Pages では、以下の設定を想定しています。

| 項目 | 設定値 |
|---|---|
| Build command | 空欄、または未設定 |
| Build output directory | `public` |
| Functions directory | `functions` |

必要な環境変数・バインディングは以下です。

| 種別 | 名前 | 用途 |
|---|---|---|
| Environment variable | `GAS_URL` | S1 の Apps Script JSON URL |
| Environment variable | `GAS_URL_S2` | S2 の Apps Script JSON URL |
| KV binding | `TRIBE_CONFIG` | S1/S2 の登場種族・非登場種族設定 |

## 更新方法

### トップページを更新する

`public/index.html` を編集します。

主に編集する箇所は以下です。

- 開催中シーズンへの導線
- News
- S級リーグのリンク
- Past Tournaments のリンク
- About me / Contact
- トップヘッダー画像や表示位置

共通デザインを変える場合は `public/common.css` を編集します。

### S級リーグの結果を更新する

基本的には HTML を直接編集せず、元データ側を更新します。

1. Google Sheets のスコア・順位・ゲーム詳細を更新する
2. Apps Script が返す JSON を確認する
3. Cloudflare Pages Function 経由の API を確認する
4. `/season1/` または `/season2/` で表示確認する

S1 の API は `/api/results`、S2 の API は `/api/season2/results` です。

### 登場種族・非登場種族を更新する

Cloudflare KV の `TRIBE_CONFIG` に保存している JSON を更新します。

- S1: `season1-tribes`
- S2: `season2-tribes`

フロント側では、各ゲームのメタ情報欄に「登場種族」「非登場種族」として表示されます。

### 過去大会ページを更新する

`public/tournaments/` 配下の対象ページを編集します。

例:

- `public/tournaments/timewalk-dream-match/index.html`
- `public/tournaments/deepblue/index.html`
- `public/tournaments/renoj/index.html`

大会ごとのページは、基本的に静的 HTML で管理しています。Tonamelリンク、開催日、ルール、結果表、配信アーカイブなどを直接編集します。

### 画像を追加・差し替えする

画像は `public/` 配下に置きます。

パス指定の例:

```html
<img src="/sutant.webp" alt="" />
```

```css
background-image: url('/tournaments/reno.webp');
```

トップページや大会カードでは、画像の見え方を CSS の `object-position`、`background-position`、`transform` で調整しています。

## 実装メモ

- このリポジトリはビルド工程を持たない静的サイト構成です。
- `public/common.css` が全体の基調デザインを持ち、個別ページでは必要に応じてページ内 `<style>` または各ディレクトリの `style.css` で上書きしています。
- S1/S2 の結果ページは、同じ画面構成をベースにしていますが、データ取得先とキャッシュ設計が一部異なります。
- 過去大会ページは、後から大会ごとに個別デザインを作りやすいよう、静的 HTML として分離しています。
- 結果データの表示が古く見える場合は、ブラウザキャッシュ、localStorage、Cloudflare のキャッシュ、Apps Script 側の反映待ちを順に確認します。

## 注意点

- `GAS_URL` や `GAS_URL_S2` に設定する Apps Script URL は、公開先に見せても問題ない Web App URL を使います。
- API が失敗した場合、ページ側では「読み込みに失敗しました」または空テーブルが表示されます。
- KV の種族設定が空でもページ自体は表示されますが、種族欄は `-` 表示になります。
- 画像ファイル名を変更した場合は、HTML/CSS 内の参照パスも必ず更新します。
