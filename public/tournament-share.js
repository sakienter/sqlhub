(() => {
  const main = document.querySelector('main.page-shell');
  if (!main || document.querySelector('.tournament-share-strip')) return;

  const style = document.createElement('style');
  style.textContent = `
    .tournament-share-strip {
      display: flex;
      width: fit-content;
      max-width: 100%;
      align-items: center;
      justify-content: center;
      gap: 5px;
      margin-right: auto;
      margin-left: auto;
      color: rgba(255,255,255,.72);
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
    }

    .tournament-share-strip--top {
      margin-top: -15px;
      margin-bottom: 7px;
    }

    .tournament-share-strip--bottom {
      margin-top: 9px;
      margin-bottom: 4px;
    }

    .tournament-share-button {
      appearance: none;
      display: inline-flex;
      min-height: 24px;
      align-items: center;
      justify-content: center;
      padding: 2px 5px;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: 1;
      cursor: pointer;
      transition: color .15s ease, background-color .15s ease;
    }

    .tournament-share-button:hover {
      color: #fff;
      background: rgba(255,255,255,.08);
    }

    .tournament-share-button:focus-visible {
      outline: 2px solid rgba(255,255,255,.52);
      outline-offset: 1px;
    }

    .tournament-share-divider {
      color: rgba(255,255,255,.30);
      font-weight: 500;
      user-select: none;
    }

    @media (max-width: 520px) {
      .tournament-share-strip {
        font-size: 9px;
      }

      .tournament-share-strip--top {
        margin-top: -13px;
        margin-bottom: 6px;
      }
    }
  `;
  document.head.appendChild(style);

  const pageUrl = document.querySelector('link[rel="canonical"]')?.href || window.location.href.split('#')[0];
  const pageTitle = document.title;

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy failed');
  };

  const createStrip = (position) => {
    const strip = document.createElement('nav');
    strip.className = `tournament-share-strip tournament-share-strip--${position}`;
    strip.setAttribute('aria-label', position === 'top' ? 'ページ上部の共有操作' : 'ページ下部の共有操作');
    strip.innerHTML = `
      <button type="button" class="tournament-share-button" data-tournament-share-x>Xで共有する</button>
      <span class="tournament-share-divider" aria-hidden="true">｜</span>
      <button type="button" class="tournament-share-button" data-tournament-share-copy>リンクをコピーする</button>
    `;

    strip.querySelector('[data-tournament-share-x]')?.addEventListener('click', () => {
      const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}`;
      const popup = window.open(shareUrl, 'tournament-share-x', 'noopener,noreferrer,width=720,height=620');
      if (popup) popup.opener = null;
    });

    const copyButton = strip.querySelector('[data-tournament-share-copy]');
    copyButton?.addEventListener('click', async () => {
      const originalLabel = 'リンクをコピーする';
      try {
        await copyText(pageUrl);
        copyButton.textContent = 'コピーしました';
      } catch {
        copyButton.textContent = 'コピーできませんでした';
      }

      window.setTimeout(() => {
        copyButton.textContent = originalLabel;
      }, 1500);
    });

    return strip;
  };

  const header = main.querySelector(':scope > header.hero') || main.querySelector('header');
  const footer = main.querySelector(':scope > footer.footer-note') || main.querySelector('footer');

  if (header) {
    header.insertAdjacentElement('afterend', createStrip('top'));
  } else {
    main.prepend(createStrip('top'));
  }

  if (footer) {
    footer.insertAdjacentElement('beforebegin', createStrip('bottom'));
  } else {
    main.append(createStrip('bottom'));
  }
})();
