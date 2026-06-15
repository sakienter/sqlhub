# スクリム参加申請 D1 セットアップ

スクリム参加申請は、Cloudflare Pages Functions と D1 を使用します。

## 1. D1データベースを作成

Cloudflare Dashboard でD1データベースを1つ作成します。

推奨名:

```text
sqlhub-scrims
```

## 2. テーブルを作成

D1のコンソールで、次のファイルのSQLを実行します。

```text
migrations/0001_scrim_registrations.sql
```

## 3. PagesへD1 Bindingを追加

Cloudflare Pagesの対象プロジェクトで、D1 Bindingを追加します。

```text
Variable name: SCRIM_DB
D1 database: sqlhub-scrims
```

PreviewとProductionの両方へ設定してください。

設定後、Pagesを再デプロイします。

## 4. 管理用パスワード

既存のPast Lobby管理と同じ環境変数を使用します。

```text
SCRIM_ADMIN_TOKEN
```

## API

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

## 日程変更

受付対象の日程は、次の2か所を同時に変更します。

- `public/scrims/index.html`
- `functions/api/scrims/registrations.js` の `EVENTS`
