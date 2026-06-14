(() => {
  const main = document.querySelector('main.page-shell');
  if (!main || document.querySelector('.tournament-share-strip')) return;

  const style = document.createElement('style');
  style.textContent = `
    .tournament-share-strip {
      display: flex;
      width: fit-content;
      max-width: calc(100% - 20px);
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: rgba(255,255,255,.72);
      font-size: 9px;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
    }

    .tournament-share-strip--top {
      position: absolute;
      top: 10px;
      right: 12px;
      z-index: 20;
      margin: 0;
      padding: 2px 4px;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 5px;
      background: rgba(4,14,24,.16);
      backdrop-filter: blur(4px);
    }

    .tournament-share-strip--bottom {
      margin: 9px auto 4px;
    }

    .tournament-share-button {
      appearance: none;
      display: inline-flex;
      min-height: 20px;
      align-items: center;
      justify-content: center;
      padding: 1px 4px;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: 1;
      cursor: pointer;
      transition: color .15s ease, background-color .15s ease;
    }

    .tournament-share-button:hover {
      color: #fff;
      background: rgba(255,255,255,.09);
    }

    .tournament-share-button:focus-visible {
      outline: 2px solid rgba(255,255,255,.52);
      outline-offset: 1px;
    }

    .tournament-share-divider {
      color: rgba(255,255,255,.28);
      font-weight: 500;
      user-select: none;
    }

    @media (max-width: 520px) {
      .tournament-share-strip {
        font-size: 8px;
      }

      .tournament-share-strip--top {
        top: 7px;
        right: 7px;
        max-width: calc(100% - 14px);
        padding: 1px 3px;
      }

      .tournament-share-button {
        min-height: 18px;
        padding: 1px 3px;
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
    strip.setAttribute('aria-label', position === 'top' ? 'ヘッダー内の共有操作' : 'ページ下部の共有操作');
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
        copyButton.textContent = 'コピー失敗';
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
    const headerPosition = window.getComputedStyle(header).position;
    if (headerPosition === 'static') header.style.position = 'relative';
    header.append(createStrip('top'));
  } else {
    main.prepend(createStrip('top'));
  }

  if (footer) {
    footer.insertAdjacentElement('beforebegin', createStrip('bottom'));
  } else {
    main.append(createStrip('bottom'));
  }
})();
