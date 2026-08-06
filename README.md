# Avenge Hub

Avenge Hub は、Stuntdrake が運営・協力する Hearthstone Battlegrounds 関連大会の情報整理サイトです。

S級リーグの試合結果・ポイント状況、大会アーカイブ、コミュニティ大会、スクリム、Battlegroundsに関するメモを掲載しています。公開環境は Cloudflare Pages、公開ディレクトリは `public`、Functionsディレクトリは `functions` です。

公開サイト: [https://stuntdrakesavenge.pages.dev/](https://stuntdrakesavenge.pages.dev/)

最終更新: 2026年8月6日

## 2026年8月6日の整理

- Bob's League「The Rush」の日本勢向け情報ページを追加
- トップページの注目枠を「THE RUSH 日本勢向け情報まとめ」へ更新
- Grand Finals進出方法、日本時間の予選日程、ラダー締切目安を掲載
- Bob's League公式サイト・公式X・公式フライヤーを案内
- OGP / Twitter Card用画像を設定
- 画像名を用途が分かる `social-card.webp` と `official-flyer.webp` に統一
- アップロード時の旧画像名は `public/_redirects` で新しい画像へ転送
- THE RUSH専用CSSを読みやすい形式に整理

## 2026年7月28日の整理

- Season 2の構成画像を `public/season2/compositions/day1/` 〜 `day4/` に集約
- 構成画像名を8選手共通のスラッグへ統一
- リーグ集計画像を用途が分かる英小文字ファイル名へ変更
- 差し替え済みの旧集計画像、破損した旧DAY3画像、未使用プレビュー、未参照画像を削除
- 画像参照、互換リダイレクト、READMEを現在の構成に合わせて更新
- Season 1の構成画像も `compositions/day1` 〜 `day4` へ統一
- トップ、リーグ、スクリム、大会の主要画像を用途名へ統一
- 大会ページ内の埋め込みCSSを大会別の `style.css` へ分離
- トップ、スクリム、Season 2関連ページに残っていた埋め込みCSSもページ別CSSへ分離
- CN対抗戦・過去大会の画像名を `banner`、`header`、`flyer` など用途が分かる名称へ統一
- 旧画像URLは `public/_redirects` に残し、既存リンクとの互換性を維持
- 静的CSS・JavaScript・画像のキャッシュ識別子を `20260728` に統一
- トップページとS級リーグSeason 1・2のインラインスタイルをクラス化し、CSSへ分離
- 全DAY・全選手の構成画像を毎週および画像更新時に検査するGitHub Actionsを追加

## 公開URL

### メイン・リーグ

| パス | 内容 |
|---|---|
| `/` | Avenge Hub トップページ |
| `/sq/season1/` | S級リーグ Season 1 |
| `/sq/season2/` | S級リーグ Season 2 |
| `/scrims/` | 練習会・スクリム |
| `/columns/` | スタドレのメモ書き |

### 大会ページ

| パス | 内容 |
|---|---|
| `/tournaments/twdm/` | 時渡りドリームマッチ |
| `/tournaments/uratop/` | バトグラ【裏】頂上戦 |
| `/tournaments/topseries/` | バトグラ頂上戦 #1〜#9 |
| `/tournaments/saikyo2026/` | バトグラ最強決定戦2026 |
| `/tournaments/deepblue/` | ディープ・ブルー杯 |
| `/tournaments/reno/` | レノ・ジャクソン杯 |
| `/tournaments/neru-battle/` | ねるばとる |
| `/tournaments/east-vs-west/` | EAST vs WEST |
| `/tournaments/studore-dopamine-cup/` | スタドレドーパミン杯 |
| `/tournaments/yoidore/` | 酔いどれ杯 |
| `/tournaments/alutemu-challenge/` | 王者Alutemuへの挑戦状 |
| `/tournaments/bobs-league-the-rush/` | THE RUSH 日本勢向け情報まとめ |
| `/tournaments/cn-vs-worlds/` | CN vs Worlds |
| `/tournaments/cn-vs-jp/` | CN vs JP |

旧URLは `public/_redirects` で現行URLへ転送します。

### Bob's League「The Rush」

- ページ: `public/tournaments/bobs-league-the-rush/index.html`
- 専用スタイル: `public/tournaments/bobs-league-the-rush/style.css`
- OGP / Twitter Card: `public/tournaments/bobs-league-the-rush/social-card.webp`
- 公式フライヤー: `public/tournaments/bobs-league-the-rush/official-flyer.webp`
- 公式サイト: [https://v2.bobsleague.com/fr/dashboard](https://v2.bobsleague.com/fr/dashboard)
- 公式X: [@Bobs_League](https://x.com/Bobs_League)

## ディレクトリ構成

```text
sqlhub/
├── README.md
├── .github/
│   ├── PAGE_DATE_AUTOMATION.md
│   ├── scripts/
│   │   └── update_page_dates.py
│   └── workflows/
│       └── update-page-dates.yml
├── apps-script/
│   ├── season1.gs
│   └── season2.gs
├── migrations/
├── functions/
│   ├── api/
│   │   ├── scrims/
│   │   ├── season1/
│   │   └── season2/
│   └── columns/
└── public/
    ├── index.html
    ├── _headers
    ├── _redirects
    ├── common.css
    ├── home.css
    ├── home-overrides.css
    ├── composition-gallery.css
    ├── composition-gallery.js
    ├── tournament-share.js
    ├── support-share.css
    ├── support-share.js
    ├── season-banner.js
    ├── footer-updated.css
    ├── sutantic.png
    ├── sq/
    │   ├── season1/
    │   └── season2/
    ├── season1/
    │   ├── archive/
    │   └── compositions/
    │       ├── day1/
    │       ├── day2/
    │       ├── day3/
    │       └── day4/
    ├── season2/
    │   ├── compositions/
    │   │   ├── day1/
    │   │   ├── day2/
    │   │   ├── day3/
    │   │   └── day4/
    │   └── data/
    ├── tournaments/
    ├── scrims/
    │   └── admin/
    ├── columns/
    └── tribewebp/
```

`public/sq/` にはS級リーグのページ本体を配置します。`public/season1/` と `public/season2/` は、構成画像やアーカイブJSONなどの互換資産を保管する場所です。共有CSS・JavaScriptは原則として `public/` 直下のファイルを使用します。

## S級リーグ Season 1

Season 1 は終了済みのアーカイブページです。

- ページ: `public/sq/season1/index.html`
- 表示処理: `public/sq/season1/script.js`
- 静的データ読込: `public/sq/season1/cache-helper.js`
- 基本結果: `public/sq/season1/results.json`
- 種族設定: `public/sq/season1/tribes.json`
- DAY別アーカイブ: `public/season1/archive/`
- 構成画像: `public/season1/compositions/day1/` 〜 `day4/`

Season 1・Season 2ともに、構成画像は `compositions/day<番号>/<選手スラッグ>.webp` の形式で管理します。旧Season 1画像URLは `public/_redirects` で現行パスへ転送します。

## S級リーグ Season 2

Season 2 はリポジトリ内の静的JSONとJavaScriptで管理します。

- ページ: `public/sq/season2/index.html`
- 基本結果: `public/sq/season2/results.json`
- DAY2追加データ: `public/sq/season2/results-day2.json`
- DAY3追加データ: `public/sq/season2/results-day3.json`
- DAY4追加データ: `public/sq/season2/results-day4.json`
- 種族データ: `public/sq/season2/tribes.json`
- データ定義・正規化: `public/sq/season2/data.js`
- 総合順位処理: `public/sq/season2/summary.js`
- 表・タブ描画: `public/sq/season2/render.js`
- 初期化: `public/sq/season2/init.js`
- 結果表示スタイル: `public/sq/season2/results.css`

未入力の結果は「未実施」と表示されます。

### 構成画像

共有ギャラリーは `public/composition-gallery.js` で管理します。

| DAY | 保存先 |
|---|---|
| DAY1 | `public/season2/compositions/day1/` |
| DAY2 | `public/season2/compositions/day2/` |
| DAY3 | `public/season2/compositions/day3/` |
| DAY4 | `public/season2/compositions/day4/` |

すべてWebP形式で、各DAYに次の8ファイルを置きます。

```text
alutemu.webp
barrette.webp
gyan.webp
haguren.webp
masa007.webp
matsuri.webp
reverent.webp
thundurus.webp
```

共有ギャラリーはこの命名規則から画像URLを生成します。DAY1・DAY2の旧 `.jpg` パスは `public/_redirects` で現行WebPへ内部転送します。

### 構成画像の自動検査

`.github/scripts/check_composition_images.mjs` は、Season 1・2の全4DAYについて、対象選手64枚のWebPが存在し、空ファイルではないことを検査します。

GitHub Actionsの `Check composition images` は次のタイミングで実行されます。

- 毎週月曜日
- 構成画像または検査スクリプトを更新したとき
- Actions画面から手動実行したとき

ローカルでは次のコマンドで同じ検査を実行できます。

```bash
node .github/scripts/check_composition_images.mjs
```

### リーグ集計画像

`public/season2/data/` に次の3ファイルを置きます。

| ファイル | 内容 |
|---|---|
| `hero-stats.webp` | ヒーロー集計 |
| `lesser-trinket-stats.webp` | 下級装飾品集計 |
| `greater-trinket-stats.webp` | 上級装飾品集計 |

表示ページは `public/sq/season2/league-stats/index.html` です。旧ファイル名への外部アクセスは `public/_redirects` で現行ファイルへ転送します。

### 結果データの基本構造

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

ゲーム別詳細の行:

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

## トップページ

トップページは `public/index.html`、専用スタイルは `public/home.css` と `public/home-overrides.css` です。

## ファイル命名とキャッシュ

- 画像名は英小文字の kebab-case とし、役割が分かる `banner.webp`、`header.webp`、`card-banner.webp`、`flyer-1.webp` のような名前を使用します。
- 複数フライヤーは同じ大会ディレクトリに `flyer-1.webp`、`flyer-2.webp` のように連番で配置します。
- 静的ファイルを更新した場合は、参照URLの `?v=YYYYMMDD` を更新します。
- 公開済みのパスを変更した場合は、必ず `public/_redirects` に旧パスからの301転送を追加します。

主な管理対象:

- 開催中シーズンへのリンク
- S級リーグカード
- `Tournament Series`
- その他の大会
- 国際大会
- スクリム
- About / Contact
- Blog
- Special Thanks
- Support & Share

大会カードを追加する場合は、ページ本体、トップページのリンク、バナー背景、公開URL、戻るリンクをまとめて確認してください。

### Season 2メイン表示の自動切り替え

`public/season-banner.js` が `Asia/Tokyo` の日付を参照し、トップページのSeason 2表示を自動で変更します。

| 期間 | 表示状態 |
|---|---|
| 2026年6月26日まで | 開幕予定 |
| 2026年6月27日〜7月25日 | 開催中 |
| 2026年7月26日以降 | 結果・アーカイブ |

開催期間を変更する場合は、`openingDay` と `finalDay` を同時に更新してください。

## 大会ページ

大会ページは `public/tournaments/<slug>/index.html` に配置します。大会固有のスタイルは同じフォルダの `style.css` に配置します。

共通事項:

- 共通スタイル: `public/common.css`
- 共有操作: `public/tournament-share.js`
- 共通フッター: `public/footer-updated.css`
- 大会固有スタイル: `public/tournaments/<slug>/style.css`
- サイトアイコン: `public/sutantic.png`
- 戻るリンクはトップページまたは大会一覧へ向ける
- 外部リンクには必要に応じて `target="_blank"` と `rel="noopener noreferrer"` を付ける

大会固有のヘッダー、アニメーション、ルール表示は各大会フォルダの `style.css` と、必要に応じて `index.html` 内のJavaScriptで管理します。

### 大会画像の命名

新規画像は用途が分かる英小文字名を使用します。

| ファイル名 | 用途 |
|---|---|
| `banner.webp` | トップページの大会カード、ページヘッダー |
| `flyer.webp` | 公式フライヤー |
| `flyer-1.webp`、`flyer-2.webp` | 複数枚の公式フライヤー |
| `social-card.jpg` / `social-card.webp` | OGP・Xリンクカード |
| `header.webp` | ページ専用ヘッダー背景 |
| `qualifier-east.webp` | EAST予選画像 |
| `qualifier-west.webp` | WEST予選画像 |
| `recruitment-example.webp` | 募集告知例 |

画像を改名・移動した場合は、HTML、CSS、OGP設定、トップページ、`public/_redirects` を同時に更新します。

## スクリム

- 公開ページ: `public/scrims/index.html`
- 参加登録UI: `public/scrims/registration-app.js`
- 過去ロビー表示: `public/scrims/past-lobbies.js`
- フォールバックデータ: `public/scrims/past-lobbies.json`
- 管理画面: `public/scrims/admin/index.html`
- 現行管理スクリプト: `public/scrims/admin/admin-v2.js`
- API: `functions/api/scrims/`
- D1マイグレーション: `migrations/`

管理画面の認証情報やCloudflare D1の設定は `SCRIM_ADMIN_SETUP.md` と `SCRIM_D1_SETUP.md` を参照してください。

## スタドレのメモ書き

メモページは `public/columns/index.html`、公開URLは `/columns/` です。

主な内容:

- Battlegroundsシーズン履歴
- 公式パッチノートへのリンク
- ミニオン・酒場呪文のプール枚数
- Battlegroundsに関する記事・メモ

記事スタイルは `public/columns/` 内のCSSで管理します。

## 共有・支援機能

### トップページ

`public/support-share.js` と `public/support-share.css` が共有・支援UIを管理します。

### 大会・スクリムページ

`public/tournament-share.js` がページ上部と下部へ次の操作を追加します。

- Xで共有する
- リンクをコピーする

共有URLには各ページのcanonical URLを使用します。

### Xリンクカード画像

| ページ | 画像 |
|---|---|
| トップページ | `public/og-image.jpg` |
| スクリム | `public/scrims/social-card.webp` |
| EAST vs WEST | `public/tournaments/east-vs-west/banner.webp` |
| 王者Alutemuへの挑戦状 | `public/tournaments/alutemu-challenge/social-card.jpg` |

リンクカードを変更する場合は、各HTMLの `og:image`、`og:image:secure_url`、`twitter:image`、画像サイズ、キャッシュ識別子を同時に更新してください。

## ページ最終更新日の自動反映

HTMLページのフッターは次の形式です。

```html
<footer class="footer-note" data-page-updated="2026-07-20">
  <p>Stuntdrake's Avenge! / Tournament info by Stuntdrake</p>
  <p class="footer-updated">最終更新：<time datetime="2026-07-20">2026年7月20日</time></p>
  <p class="footer-update-note">※更新日はページの一部修正を含みます。</p>
</footer>
```

`main` へのpush後、`.github/workflows/update-page-dates.yml` が `.github/scripts/update_page_dates.py` を実行します。差分がある場合は `chore: update page dates [skip ci]` コミットを作成します。

詳細は `.github/PAGE_DATE_AUTOMATION.md` を参照してください。

## URL変更と互換性

URLルールは `public/_redirects` で管理します。

- 旧ページURLは現行URLへ `301` 転送
- 末尾スラッシュなしのURLを正規URLへ統一
- レガシー資産は必要に応じて `200` の内部書き換えで参照
- 共有CSS・JavaScriptは `public/` 直下へ集約

ページや資産を移動する場合は、トップページ、戻るリンク、CSS・JavaScript・画像参照、管理画面、READMEを同時に更新してください。

## GitHub Actions

継続運用するワークフローは `.github/workflows/update-page-dates.yml` です。ページへ一度だけscriptタグを追加する旧ワークフローは削除済みです。共有スクリプトの追加・更新は対象HTMLを直接編集してください。

## Cloudflare Pages

| 項目 | 設定値 |
|---|---|
| Build command | 空欄または未設定 |
| Build output directory | `public` |
| Functions directory | `functions` |

## 更新時の確認項目

1. JSONが正しい形式であること
2. JavaScriptとPythonに構文エラーがないこと
3. HTML内のパスが公開階層と一致すること
4. トップページのカードが現行URLを参照していること
5. 旧URLが現行URLへ転送されること
6. 構成画像、バナー画像、種族アイコン、faviconが表示されること
7. 管理画面から公開ページへ戻れること
8. Season 2の表示状態が日本時間の日付に応じて切り替わること
9. 変更ページの最終更新日がGitHub Actionsで更新されること
10. デスクトップとモバイルの両方でレイアウトが崩れないこと
11. X共有とリンクコピーが大会ページ・スクリムページで動作すること
12. canonical URLと外部リンクが正しいこと
13. 未使用ファイルを追加せず、共有資産を重複配置しないこと
