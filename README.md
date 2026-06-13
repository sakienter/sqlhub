# Avenge Hub

Avenge Hub は、Stuntdrake が運営・協力する Hearthstone Battlegrounds 関連大会の情報整理サイトです。

S級リーグの試合結果・ポイント状況、過去大会のアーカイブ、別母体大会の情報を掲載しています。Cloudflare Pages で公開し、Season 1 は Google Sheets / Apps Script と連携、Season 2 はリポジトリ内の静的 JSON で管理します。

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
│   │   ├── tribes-display.js         # S1 登場・非登場種族表示
│   │   └── *.webp                    # S1 用画像
│   ├── season2/
│   │   ├── index.html                # S級リーグ Season 2 結果ページ
│   │   ├── style.css
│   │   ├── script.js                 # S2 スクリプト読み込み
│   │   ├── parity-*.js               # S2 の表・タブ表示ロジック
│   │   ├── results.json              # S2 の静的な結果データ
│   │   ├── tribes.json               # S2 の静的な種族データ
│   │   ├── compositions/             # S2 構成画像
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
        └── season1/
            └── tribes.js             # S1 種族設定API
```

## ページ一覧

| パス | 内容 |
|---|---|
| `/` | Avenge Hub トップ。開催中シーズン、S級リーグ、スクリム、Past Tournaments、About me を表示します。 |
| `/season1/` | S級リーグ Season 1 の総合結果、DAY別結果、ゲーム別詳細を表示します。 |
| `/season2/` | S級リーグ Season 2 の総合結果、DAY別結果、ゲーム別詳細を表示します。 |
| `/tournaments/timewalk-dream-match/` | 時渡りドリームマッチのルール、最終結果、試合詳細、アーカイブを表示します。 |
| `/tournaments/ura-choujousen/` | バトグラ【裏】頂上戦の概要、出場選手、最終結果、DAY別結果を表示します。 |
| `/tournaments/choujousen/` | バトグラ頂上戦 #1〜#9 のまとめページです。 |
| `/tournaments/saikyo2026/` | バトグラ最強決定戦2026 の情報ページです。 |
| `/tournaments/deepblue/` | ディープ・ブルー杯の概要、ルール、Tonamelリンクを表示します。 |
| `/tournaments/renoj/` | レノ・ジャクソン杯の概要、ルール、Tonamelリンクを表示します。 |

## データ管理の仕組み

### S級リーグ Season 1

- フロント側: `public/season1/script.js`
- API: `/api/results`
- Pages Function: `functions/api/results.js`
- 必要な環境変数: `GAS_URL`

`GAS_URL` に指定した Apps Script の JSON エンドポイントから、S1 の総合順位、DAY別結果、ゲーム別詳細を取得します。

S1 は表示速度改善のため、ブラウザ側の localStorage キャッシュと Cloudflare Pages Function のキャッシュを利用します。

S1 の登場種族・非登場種族は、`/api/season1/tribes` と Cloudflare KV の `TRIBE_CONFIG` を利用します。KV key は `season1-tribes` です。

### S級リーグ Season 2

S2 は外部APIやGoogle Sheetsを使用せず、以下の静的ファイルを読み込みます。

- 結果データ: `public/season2/results.json`
- 登場種族・非登場種族: `public/season2/tribes.json`
- 表示ロジック: `public/season2/parity-*.js`

DAY切り替え、GAME切り替え、総合順位、Placement、ゲーム別詳細、構成画像の表示機能はJavaScriptで維持しています。データ取得先だけをリポジトリ内のJSONに固定しているため、S2用の環境変数、Pages Function、localStorageキャッシュは不要です。

結果が未入力の表は「未実施」と表示されます。

## Season 2 の更新方法

### 結果を更新する

`public/season2/results.json` を編集します。

基本構造は以下です。

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
      "points": {
        "rows": []
      },
      "placements": {
        "rows": []
      },
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

各行で使用する主なキーは以下です。

#### DAY別ポイント

```json
{
  "name": "Player Name",
  "dailyTotal": 0,
  "rank": 1,
  "game1": 7,
  "game2": 6,
  "game3": 5,
  "game4": 4,
  "game5": 3
}
```

#### DAY別Placement

```json
{
  "name": "Player Name",
  "firstCount": 1,
  "average": 3.2,
  "game1": 1,
  "game2": 2,
  "game3": 3,
  "game4": 4,
  "game5": 6
}
```

#### ゲーム別詳細

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

総合順位は `summary.rows` に選手名・順位・合計値を入力できます。DAY別ポイントに選手データが入っている場合は、各DAYの値も表示ロジック側でまとめられます。

### 登場種族・非登場種族を更新する

`public/season2/tribes.json` を編集します。

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

種族名は以下の日本語表記を使用します。

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

### 構成画像を更新する

構成画像は `public/season2/compositions/` に配置します。ファイル名と参照規則は共通の `public/composition-gallery.js` に従います。

## Cloudflare Pages 設定

Cloudflare Pages では、以下の設定を想定しています。

| 項目 | 設定値 |
|---|---|
| Build command | 空欄、または未設定 |
| Build output directory | `public` |
| Functions directory | `functions` |

必要な環境変数・バインディングはS1用のみです。

| 種別 | 名前 | 用途 |
|---|---|---|
| Environment variable | `GAS_URL` | S1 の Apps Script JSON URL |
| KV binding | `TRIBE_CONFIG` | S1 の登場種族・非登場種族設定 |

`GAS_URL_S2` と S2用のKVデータは使用しません。

## その他の更新方法

### トップページを更新する

`public/index.html` を編集します。共通デザインを変える場合は `public/common.css` を編集します。

主に以下を管理します。

- 開催中シーズンへの導線
- S級リーグのリンク
- スクリムへのリンク
- Past Tournaments のリンク
- About me / Contact
- トップヘッダー画像や表示位置

### Season 1 の結果を更新する

基本的にはHTMLを直接編集せず、Google Sheets側を更新します。

1. Google Sheetsのスコア・順位・ゲーム詳細を更新する
2. Apps Scriptが返すJSONを確認する
3. `/api/results` のレスポンスを確認する
4. `/season1/` で表示確認する

Season 1 の登場種族・非登場種族は、Cloudflare KV の `TRIBE_CONFIG` に保存している `season1-tribes` を更新します。

### 過去大会ページを更新する

`public/tournaments/` 配下の対象ページを編集します。

大会ごとのページは基本的に静的HTMLで管理しています。Tonamelリンク、開催日、ルール、結果表、配信アーカイブなどを直接編集します。

### 画像を追加・差し替えする

画像は `public/` 配下に置きます。

```html
<img src="/sutant.webp" alt="" />
```

```css
background-image: url('/tournaments/reno.webp');
```

トップページや大会カードでは、画像の見え方を CSS の `object-position`、`background-position`、`transform` で調整しています。

## 実装メモ

- ビルド工程を持たない静的サイト構成です。
- `public/common.css` が全体の基調デザインを持ち、個別ページではページ内 `<style>` または各ディレクトリの `style.css` で上書きします。
- S1は外部データ連携、S2は静的JSONという異なる運用です。
- S2のJSON取得ではブラウザキャッシュを使用せず、更新後のデータを直接読み込みます。
- 過去大会ページは、大会ごとの個別デザインを作りやすいよう静的HTMLとして分離しています。

## 注意点

- `results.json` と `tribes.json` は正しいJSON形式を維持してください。末尾カンマは使用できません。
- S2のDAYとGAMEの配列順は、画面上のDAY1〜DAY4、GAME1〜GAME5に対応します。
- 空の `rows` は未実施として扱われます。
- 画像ファイル名を変更した場合は、HTML、CSS、JavaScript内の参照パスも更新してください。
- S1の表示が古い場合は、ブラウザキャッシュ、localStorage、Cloudflareキャッシュ、Apps Script側の反映を順に確認してください。
