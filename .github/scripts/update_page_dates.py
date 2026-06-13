#!/usr/bin/env python3
"""Update page metadata with the current Japan date and shared favicon.

The script is intended to run in GitHub Actions after each push. It updates:
- HTML pages changed directly
- the nearest page for changed page-local assets/data
- pages that reference changed shared CSS/JS/assets
- any page that still lacks the standardized update-date footer
- any HTML page that still lacks the shared favicon link
"""

from __future__ import annotations

import argparse
import re
from collections import deque
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

PUBLIC_DIR = Path("public")
TEXT_EXTENSIONS = {".html", ".css", ".js", ".json"}

FOOTER_RE = re.compile(
    r"(?P<indent>^[ \t]*)<footer\b(?P<attrs>[^>]*\bclass=(?P<quote>[\"'])[^\"']*\bfooter-note\b[^\"']*(?P=quote)[^>]*)>.*?</footer>",
    re.IGNORECASE | re.MULTILINE | re.DOTALL,
)

STYLE_LINK = '<link rel="stylesheet" href="/footer-updated.css?v=20260614" />'
FAVICON_LINK = '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />'


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def html_pages() -> list[Path]:
    return sorted(PUBLIC_DIR.rglob("*.html"))


def has_footer(content: str) -> bool:
    return FOOTER_RE.search(content) is not None


def has_favicon(content: str) -> bool:
    return "/favicon.svg" in content


def japanese_date(date_value: datetime) -> tuple[str, str]:
    iso_date = date_value.strftime("%Y-%m-%d")
    visible = f"{date_value.year}年{date_value.month}月{date_value.day}日"
    return iso_date, visible


def footer_markup(indent: str, date_value: datetime) -> str:
    iso_date, visible = japanese_date(date_value)
    inner = indent + "  "
    return (
        f'{indent}<footer class="footer-note" data-page-updated="{iso_date}">\n'
        f"{inner}<p>Stuntdrake's Avenge! / Tournament info by Stuntdrake</p>\n"
        f'{inner}<p class="footer-updated">最終更新：<time datetime="{iso_date}">{visible}</time></p>\n'
        f'{inner}<p class="footer-update-note">※更新日はページの一部修正を含みます。</p>\n'
        f"{indent}</footer>"
    )


def add_head_entry(content: str, marker: str, markup: str) -> str:
    if marker in content:
        return content

    head_close = re.search(r"^[ \t]*</head>", content, re.IGNORECASE | re.MULTILINE)
    if not head_close:
        return content

    indent_match = re.match(r"[ \t]*", head_close.group(0))
    indent = indent_match.group(0) if indent_match else ""
    return content[: head_close.start()] + f"{indent}{markup}\n" + content[head_close.start() :]


def add_stylesheet(content: str) -> str:
    return add_head_entry(content, "/footer-updated.css", STYLE_LINK)


def add_favicon(content: str) -> str:
    return add_head_entry(content, "/favicon.svg", FAVICON_LINK)


def update_page(path: Path, date_value: datetime) -> bool:
    original = read_text(path)
    updated = original

    if has_footer(updated):
        updated = FOOTER_RE.sub(
            lambda footer_match: footer_markup(footer_match.group("indent"), date_value),
            updated,
            count=1,
        )
        updated = add_stylesheet(updated)

    updated = add_favicon(updated)

    if updated == original:
        return False

    path.write_text(updated, encoding="utf-8")
    return True


def normalize_changed_path(raw_path: str) -> Path | None:
    raw_path = raw_path.strip()
    if not raw_path:
        return None

    path = Path(raw_path)
    try:
        path.relative_to(PUBLIC_DIR)
    except ValueError:
        return None
    return path


def nearest_index_page(path: Path, page_set: set[Path]) -> Path | None:
    current = path if path.is_dir() else path.parent
    while current == PUBLIC_DIR or PUBLIC_DIR in current.parents:
        candidate = current / "index.html"
        if candidate in page_set:
            return candidate
        if current == PUBLIC_DIR:
            break
        current = current.parent
    return None


def reference_tokens(path: Path) -> set[str]:
    try:
        rel = path.relative_to(PUBLIC_DIR).as_posix()
    except ValueError:
        return set()

    return {
        rel,
        f"/{rel}",
        path.name,
    }


def build_reference_index(files: list[Path]) -> dict[Path, str]:
    result: dict[Path, str] = {}
    for path in files:
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            result[path] = read_text(path)
        except (OSError, UnicodeDecodeError):
            continue
    return result


def pages_affected_by_references(
    changed_path: Path,
    page_set: set[Path],
    text_index: dict[Path, str],
) -> set[Path]:
    affected: set[Path] = set()
    visited: set[Path] = set()
    queue: deque[Path] = deque([changed_path])

    while queue:
        dependency = queue.popleft()
        if dependency in visited:
            continue
        visited.add(dependency)
        tokens = reference_tokens(dependency)
        if not tokens:
            continue

        for candidate, content in text_index.items():
            if candidate == dependency or candidate in visited:
                continue
            if not any(token in content for token in tokens):
                continue

            if candidate in page_set:
                affected.add(candidate)
            elif candidate.suffix.lower() in {".css", ".js", ".json"}:
                queue.append(candidate)

    return affected


def known_asset_targets(path: Path, page_set: set[Path]) -> set[Path]:
    result: set[Path] = set()
    path_text = path.as_posix()

    mappings = {
        "public/season1/": Path("public/sq/season1/index.html"),
        "public/season2/": Path("public/sq/season2/index.html"),
    }

    for prefix, page in mappings.items():
        if path_text.startswith(prefix) and page in page_set:
            result.add(page)

    if path_text.startswith("public/tribewebp/"):
        for page in (
            Path("public/sq/season1/index.html"),
            Path("public/sq/season2/index.html"),
        ):
            if page in page_set:
                result.add(page)

    return result


def determine_targets(changed_paths: list[Path], pages: list[Path]) -> set[Path]:
    page_contents = {page: read_text(page) for page in pages}
    page_set = set(pages)
    footer_pages = {page for page, content in page_contents.items() if has_footer(content)}

    # Initialize missing standardized metadata across the site.
    targets = {
        page
        for page, content in page_contents.items()
        if not has_favicon(content)
        or (page in footer_pages and "data-page-updated=" not in content)
    }

    public_files = [path for path in PUBLIC_DIR.rglob("*") if path.is_file()]
    text_index = build_reference_index(public_files)

    for changed_path in changed_paths:
        if changed_path in page_set:
            targets.add(changed_path)

        nearest = nearest_index_page(changed_path, footer_pages)
        if nearest:
            targets.add(nearest)

        targets.update(known_asset_targets(changed_path, footer_pages))
        targets.update(
            pages_affected_by_references(changed_path, footer_pages, text_index)
        )

    return targets


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--changed-files",
        type=Path,
        help="Text file containing one changed repository path per line.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Update every HTML page.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pages = html_pages()
    now_jst = datetime.now(ZoneInfo("Asia/Tokyo"))

    if args.all:
        targets = set(pages)
    else:
        raw_changed = []
        if args.changed_files and args.changed_files.exists():
            raw_changed = args.changed_files.read_text(encoding="utf-8").splitlines()
        changed_paths = [
            path
            for raw_path in raw_changed
            if (path := normalize_changed_path(raw_path)) is not None
        ]
        targets = determine_targets(changed_paths, pages)

    updated_paths = []
    for page in sorted(targets):
        if update_page(page, now_jst):
            updated_paths.append(page.as_posix())

    if updated_paths:
        print("Updated page metadata:")
        for path in updated_paths:
            print(f"- {path}")
    else:
        print("No page metadata changes were needed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
