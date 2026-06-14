(() => {
  const section = document.querySelector('#support-share');
  if (!section) return;

  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const pageUrl = canonical || window.location.href;
  const pageTitle = document.title;
  const status = section.querySelector('[data-share-status]');

  const setStatus = (message) => {
    if (!status) return;
    status.textContent = message;
  };

  const openShareWindow = (url) => {
    const popup = window.open(
      url,
      'stuntdrake-share',
      'noopener,noreferrer,width=720,height=620'
    );

    if (popup) {
      popup.opener = null;
      setStatus('共有画面を開きました。');
    } else {
      setStatus('共有画面を開けませんでした。ポップアップの許可設定をご確認ください。');
    }
  };

  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(pageTitle);
  const shareTargets = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  };

  section.querySelectorAll('[data-share-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.shareTarget;
      const shareUrl = shareTargets[target];
      if (shareUrl) openShareWindow(shareUrl);
    });
  });

  section.querySelector('[data-bookmark-button]')?.addEventListener('click', async () => {
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    const shortcut = /mac|iphone|ipad|ipod/i.test(platform) ? '⌘ + D' : 'Ctrl + D';

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(pageUrl);
      setStatus(`URLをコピーしました。ブックマークへの追加は ${shortcut} をご利用ください。`);
    } catch {
      setStatus(`ブックマークへの追加は ${shortcut} をご利用ください。`);
    }
  });

  const supportUrl = section.dataset.supportUrl?.trim();
  const supportRow = section.querySelector('[data-support-row]');
  const supportLink = section.querySelector('[data-support-link]');

  if (supportUrl && supportRow && supportLink) {
    supportLink.href = supportUrl;
    supportRow.hidden = false;
  }
})();
