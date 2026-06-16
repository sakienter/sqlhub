(() => {
  'use strict';

  // 記事の表示順は、この配列の並びだけを変更すれば調整できます。
  const ARTICLE_ORDER = [
    'armor-history-title',
    'season-history-title',
    'pool-title',
    'rdu-beast-title'
  ];

  const toc = document.querySelector('.memo-toc');
  const list = toc?.querySelector('ol');
  const footer = document.querySelector('.memo-footer');

  if (!toc || !list || !footer) return;

  document.documentElement.classList.add('memo-browser-ready');

  const records = ARTICLE_ORDER.map((headingId) => {
    const heading = document.getElementById(headingId);
    const article = heading?.closest('.memo-entry');
    const link = list.querySelector(`a[href="#${headingId}"]`);
    const item = link?.closest('li');

    return heading && article && link && item
      ? { headingId, heading, article, link, item }
      : null;
  }).filter(Boolean);

  if (!records.length) return;

  document.querySelectorAll('.memo-date').forEach((date) => date.remove());

  const title = toc.querySelector('.memo-toc-title');
  if (title) title.remove();

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'memo-toc-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'memo-article-list');
  toggle.innerHTML = `
    <span class="memo-toc-toggle-label">記事一覧</span>
    <span class="memo-toc-toggle-state" aria-hidden="true">＋</span>
  `;

  list.id = 'memo-article-list';
  list.hidden = true;
  toc.insertBefore(toggle, list);

  records.forEach(({ item }, index) => {
    item.querySelector('.memo-toc-number').textContent = String(index + 1).padStart(2, '0');
    list.appendChild(item);
  });

  records.forEach(({ article }) => footer.before(article));

  const setListOpen = (open) => {
    list.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.memo-toc-toggle-state').textContent = open ? '−' : '＋';
  };

  const showArticle = (headingId, { scroll = true, updateHistory = true } = {}) => {
    const selected = records.find((record) => record.headingId === headingId);
    if (!selected) return;

    records.forEach(({ article, link }) => {
      const isSelected = article === selected.article;
      article.hidden = !isSelected;
      article.classList.toggle('is-selected', isSelected);
      link.classList.toggle('is-selected', isSelected);
      link.setAttribute('aria-current', isSelected ? 'true' : 'false');
    });

    setListOpen(false);

    if (!selected.article.querySelector('.memo-article-back')) {
      const backButton = document.createElement('button');
      backButton.type = 'button';
      backButton.className = 'memo-article-back';
      backButton.textContent = '← 記事一覧に戻る';
      backButton.addEventListener('click', () => {
        setListOpen(true);
        toc.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toggle.focus({ preventScroll: true });
      });
      selected.article.prepend(backButton);
    }

    if (updateHistory) {
      history.replaceState(null, '', `#${headingId}`);
    }

    if (scroll) {
      requestAnimationFrame(() => {
        selected.article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  toggle.addEventListener('click', () => {
    setListOpen(list.hidden);
  });

  records.forEach(({ headingId, link }) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showArticle(headingId);
    });
  });

  records.forEach(({ article, link }) => {
    article.hidden = true;
    link.setAttribute('aria-current', 'false');
  });

  const initialHeadingId = location.hash.slice(1);
  if (ARTICLE_ORDER.includes(initialHeadingId)) {
    showArticle(initialHeadingId, { scroll: false, updateHistory: false });
  }
})();
