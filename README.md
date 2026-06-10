# S級リーグ ハブサイト

S級リーグの公式ハブサイトです。Cloudflare Pages で公開します。

## フォルダ構成

```
sqls-hub/
└── public/
    ├── index.html   ← ハブページ
    ├── S1.html  ← 
    └── S2.html   ← 
プラスで時渡DMも追加しておく。
```

## セットアップ

1. このリポジトリを GitHub に作成してpush
2. Cloudflare Pages で新プロジェクトを作成
   - ビルドコマンド: なし（空欄）
   - 出力ディレクトリ: `public`
3. デプロイ後、`index.html` 内の以下を実際のURLに書き換える
   - `YOUR-HUB-DOMAIN` → このサイトのドメイン
   - `YOUR-S1-DOMAIN`  → S1サイトのドメイン

## リンクの更新方法

| 場所 | 内容 |
|------|------|
| `YOUR-HUB-DOMAIN` | このハブサイトのドメイン（roster/rulesのリンク） |
| `YOUR-S1-DOMAIN`  | S1サイトのドメイン |
| S2公開時 | `nav-card disabled` の `disabled` を削除し、hrefにS2のURLを入れる |
