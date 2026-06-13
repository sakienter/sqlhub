from __future__ import annotations

from pathlib import Path
import re
import shutil
import textwrap

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def remove(path: str) -> None:
    target = ROOT / path
    if target.is_dir():
        shutil.rmtree(target)
    elif target.exists():
        target.unlink()


# 1. Move the homepage-only styles out of index.html.
home_path = 'public/index.html'
home = read(home_path)
style_match = re.search(r'\n  <style>\n(?P<css>.*?)\n  </style>', home, flags=re.DOTALL)
if style_match:
    css = textwrap.dedent(style_match.group('css')).strip() + '\n'
    write('public/home.css', css)
    replacement = '\n  <link rel="stylesheet" href="./home.css?v=20260613-cleanup" />'
    home = home[:style_match.start()] + replacement + home[style_match.end():]
    write(home_path, home)


# 2. Share the identical tribe-admin stylesheet.
admin_css_source = ROOT / 'public/season1/admin/style.css'
if admin_css_source.exists():
    write('public/admin-tribes.css', admin_css_source.read_text(encoding='utf-8'))

for admin_index in ('public/season1/admin/index.html', 'public/season2/admin/index.html'):
    html = read(admin_index)
    html = html.replace(
        '  <link rel="stylesheet" href="./style.css" />',
        '  <link rel="stylesheet" href="../../admin-tribes.css" />',
    )
    write(admin_index, html)

remove('public/season1/admin/style.css')
remove('public/season2/admin/style.css')


# 3. Simplify Season 2 loading and replace legacy parity names with role-based names.
renames = {
    'public/season2/parity-config.js': 'public/season2/data.js',
    'public/season2/parity-summary.js': 'public/season2/summary.js',
    'public/season2/parity-render.js': 'public/season2/render.js',
    'public/season2/parity-extras.js': 'public/season2/init.js',
    'public/season2/parity.css': 'public/season2/results.css',
}
for source, destination in renames.items():
    source_path = ROOT / source
    destination_path = ROOT / destination
    if source_path.exists():
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        if destination_path.exists():
            destination_path.unlink()
        source_path.rename(destination_path)

s2_path = 'public/season2/index.html'
s2 = read(s2_path)
s2 = s2.replace(
    '  <link rel="stylesheet" href="./style.css?v=s2-static-20260613" />\n'
    '  <link rel="stylesheet" href="../composition-gallery.css?v=20260613-2" />',
    '  <link rel="stylesheet" href="./style.css?v=s2-static-20260613" />\n'
    '  <link rel="stylesheet" href="../season1/meta-layout.css?v=s2-static-20260613" />\n'
    '  <link rel="stylesheet" href="../season1/tribe-image-zoom.css?v=s2-static-20260613" />\n'
    '  <link rel="stylesheet" href="./results.css?v=s2-static-20260613" />\n'
    '  <link rel="stylesheet" href="../composition-gallery.css?v=20260613-2" />',
)
s2 = s2.replace(
    '  <script src="./script.js?v=s2-static-20260613"></script>\n'
    '  <script src="../composition-gallery.js?v=20260613"></script>',
    '  <script src="./data.js?v=s2-static-20260613"></script>\n'
    '  <script src="./summary.js?v=s2-static-20260613"></script>\n'
    '  <script src="./render.js?v=s2-static-20260613"></script>\n'
    '  <script src="./init.js?v=s2-static-20260613"></script>\n'
    '  <script src="../composition-gallery.js?v=20260613"></script>',
)
write(s2_path, s2)

remove('public/season2/script.js')
remove('public/season2/parity.js')
remove('public/season2/tribes-config.js')
remove('public/season1/tribes-display.css')


# 4. Remove source uploads and superseded artwork that are not part of the deployed site.
for obsolete in (
    'np',
    'tribe_icons_256_webp',
    'public/scrims/b2bbn.webp',
    'public/season1/yubiwa.webp',
    'public/season1/yubiwatop.webp',
    'public/season2/sky.webp',
    'public/season2/skygo.webp',
    'public/sta.webp',
    'public/tournaments/cn-vs-worlds/gt.webp',
):
    remove(obsolete)


# 5. Keep the repository guide aligned with the actual structure.
readme_path = 'README.md'
readme = read(readme_path)
readme = readme.replace(
    '│   ├── common.css                    # サイト共通スタイル\n'
    '│   ├── sutant.webp                   # トップページ用ヘッダー画像',
    '│   ├── common.css                    # 共通スタイルの入口\n'
    '│   ├── common-base.css               # 共通スタイル本体\n'
    '│   ├── common-overrides.css          # 共通スタイルの調整\n'
    '│   ├── home.css                      # トップページ専用スタイル\n'
    '│   ├── admin-tribes.css              # S1 / S2 管理画面共通スタイル\n'
    '│   ├── composition-gallery.css       # 構成ギャラリー共通スタイル\n'
    '│   ├── composition-gallery.js        # 構成ギャラリー共通処理\n'
    '│   ├── sutant.webp                   # トップページ用ヘッダー画像',
)
readme = readme.replace(
    '│   │   ├── script.js                 # S2 スクリプト読み込み\n'
    '│   │   ├── parity-*.js               # S2 の表・タブ表示ロジック',
    '│   │   ├── data.js                   # S2 データ定義・正規化\n'
    '│   │   ├── summary.js                # S2 総合順位処理\n'
    '│   │   ├── render.js                 # S2 表・タブ描画\n'
    '│   │   ├── init.js                   # S2 初期化処理\n'
    '│   │   ├── results.css               # S2 結果表示補助スタイル',
)
readme = readme.replace(
    '- 表示ロジック: `public/season2/parity-*.js`',
    '- 表示ロジック: `public/season2/data.js`、`summary.js`、`render.js`、`init.js`',
)
readme = readme.replace(
    '| `/tournaments/renoj/` | レノ・ジャクソン杯の概要、ルール、Tonamelリンクを表示します。 |',
    '| `/tournaments/renoj/` | レノ・ジャクソン杯の概要、ルール、Tonamelリンクを表示します。 |\n'
    '| `/tournaments/cn-vs-worlds/` | CN vs Worlds のルール、予選、決勝結果を表示します。 |\n'
    '| `/tournaments/cn-vs-jp/` | CN vs JP の大会情報と結果を表示します。 |\n'
    '| `/scrims/` | スクリムの開催案内と過去ロビーを表示します。 |',
)
write(readme_path, readme)


# 6. Remove temporary audit files from the cleanup branch.
for temporary in (
    '.github/audit-trigger.txt',
    '.github/scripts/repo_audit.py',
    '.github/workflows/repository-audit.yml',
    '.github/workflows/repository-audit-pr.yml',
    '.github/scripts/apply_cleanup.py',
):
    remove(temporary)
