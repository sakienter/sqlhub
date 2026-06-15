# スクリム参加申請 D1 セットアップ

スクリム参加申請は、Cloudflare Pages Functions と D1 を使用します。

## 1. D1データベースを作成

Cloudflare Dashboard でD1データベースを1つ作成します。

推奨名:

```text
sqlhub-scrims
```

## 2. テーブルを作成

D1のコンソールで、次のSQLを実行します。

```text
migrations/0001_scrim_registrations.sql
migrations/0002_scrim_events.sql
```

既存の日程テーブルへ開催終了機能を追加するSQLは以下です。

```text
migrations/0003_scrim_event_results.sql
```

`0002`・`0003`を未実行でも、開催日程APIへの初回アクセス時に必要なテーブルと列は自動作成されます。

## 3. PagesへBindingを追加

Cloudflare Pagesの対象プロジェクトで、次のBindingを設定します。

```text
Variable name: SCRIM_DB
D1 database: sqlhub-scrims
```

Past Lobbyとの連動には、既存のKV Bindingも必要です。

```text
Variable name: TRIBE_CONFIG
KV namespace: sqlhub-tribe-config
```

PreviewとProductionの両方へ設定してください。設定後、Pagesを再デプロイします。

## 4. 管理用パスワード

既存のPast Lobby管理と同じ環境変数を使用します。

```text
SCRIM_ADMIN_TOKEN
```

## 開催日程の管理

`/scrims/admin/` の「開催日程管理」から、次の内容を登録・変更します。

- 開催日
- 開始時刻
- 集合時刻
- 開催状態
- 結果スプレッドシートURL

### 開催状態

| 状態 | 公開フォーム | Past Lobby |
|---|---|---|
| 受付中 | 表示 | 追加しない |
| 受付停止 | 非表示 | 追加しない |
| 開催終了 | 非表示 | 結果URLを自動追加 |

「開催終了」を選ぶ場合は、Googleスプレッドシートの結果URLが必須です。保存するとPast Lobbyへ自動追加されます。

開催終了から受付中・受付停止へ戻した場合は、その日程から自動作成されたPast Lobbyだけが取り下げられます。手動で登録したPast Lobbyは削除されません。

## API

### 公開日程

```text
GET /api/scrims/events
```

### 公開申請

```text
POST /api/scrims/registrations
```

送信例:

```json
{
  "eventId": "2026-06-18",
  "battleTag": "Name#1234",
  "xAccount": "@username"
}
```

### 管理者用

```text
GET    /api/scrims/events?all=1
POST   /api/scrims/events
PATCH  /api/scrims/events
DELETE /api/scrims/events

GET    /api/scrims/registrations
PATCH  /api/scrims/registrations
DELETE /api/scrims/registrations
```

管理者用APIは、次のAuthorizationヘッダーが必要です。

```text
Authorization: Bearer <SCRIM_ADMIN_TOKEN>
```

## 申請状態

| 値 | 表示 |
|---|---|
| `pending` | 申請中 |
| `accepted` | 参加確定 |
| `waitlisted` | 補欠 |
| `cancelled` | 辞退 |
| `rejected` | 却下 |
