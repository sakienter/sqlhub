# Past Lobby 管理画面の設定

## 管理画面

公開後、以下のパスから利用します。

```text
/scrims/admin/
```

公開ページから管理画面へのリンクは表示していません。

## 初回設定

Cloudflare Pages のプロジェクト設定で、管理用パスワードを環境変数として登録します。

| 種別 | 名前 | 内容 |
|---|---|---|
| Secret / Environment variable | `SCRIM_ADMIN_TOKEN` | 管理画面で入力する任意のパスワード |

Production 環境で登録後、再デプロイしてください。Preview環境でも管理画面を使う場合は、Preview側にも同じ変数を設定します。

保存先には既存のKV binding `TRIBE_CONFIG` を利用します。Past Lobbyのデータは、以下のKVキーに保存されます。

```text
scrim-past-lobbies
```

## 使い方

1. `/scrims/admin/` を開く
2. `SCRIM_ADMIN_TOKEN` に設定した管理用パスワードを入力する
3. 開催日を選択する
4. GoogleスプレッドシートのURLを入力する
5. 「Past Lobbyに追加する」を押す

追加後、`/scrims/` のPast Lobby欄へ同じデザインのカードが自動表示されます。カードは開催日の新しい順に並びます。

管理画面下部では、登録済みロビーの確認と削除ができます。

## 入力制限

- 日付は必須です。
- URLは `https://docs.google.com/spreadsheets/` から始まるGoogleスプレッドシートURLのみ登録できます。
- 同じ日付と同じURLの重複登録はできません。
- 管理用パスワードはブラウザの `sessionStorage` に保存され、タブを閉じると消えます。

## 関連ファイル

```text
public/scrims/admin/index.html
public/scrims/admin/admin.js
public/scrims/past-lobbies.js
functions/api/scrims/past-lobbies.js
```
