(() => {
  const section = document.querySelector('#support-share');
  const container = section?.querySelector('.support-share-list');
  if (!section || !container) return;

  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const pageUrl = canonical || window.location.href;
  const pageTitle = document.title;
  const supportUrl = 'https://www.buymeacoffee.com/sakienter';

  container.innerHTML = `
    <div class="support-actions" aria-label="サイトの応援と共有">
      <button type="button" class="support-button button-coffee" data-support-button>
        <span class="support-button-icon" aria-hidden="true">☕</span>
        <span class="support-button-label">コーヒーで応援</span>
        <span class="support-button-tail" aria-hidden="true">+</span>
      </button>

      <button type="button" class="support-button button-x" data-x-share>
        <span class="support-button-icon" aria-hidden="true">𝕏</span>
        <span class="support-button-label">Xで共有する</span>
        <span class="support-button-tail" aria-hidden="true">↗</span>
      </button>

      <button type="button" class="support-button button-copy" data-copy-link>
        <span class="support-button-icon" aria-hidden="true">⧉</span>
        <span class="support-button-label">リンクをコピーする</span>
        <span class="support-button-tail" aria-hidden="true">✓</span>
      </button>

      <button type="button" class="support-button button-bookmark" data-bookmark-button>
        <span class="support-button-icon" aria-hidden="true">▱</span>
        <span class="support-button-label">ブックマークに追加する</span>
        <span class="support-button-tail" aria-hidden="true">+</span>
      </button>
    </div>
    <p class="support-share-status" data-share-status aria-live="polite"></p>
  `;

  const status = container.querySelector('[data-share-status]');
  const copyButton = container.querySelector('[data-copy-link]');
  const setStatus = (message) => {
    status.textContent = message;
  };

  const waitForCoffeeWidget = (timeout = 6000) => new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const button = document.getElementById('bmc-wbtn');
      if (button) {
        window.clearInterval(timer);
        button.setAttribute('aria-hidden', 'true');
        resolve(button);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });

  const loadCoffeeWidget = () => {
    const existingScript = document.querySelector('script[data-name="BMC-Widget"]');
    if (existingScript) return waitForCoffeeWidget();

    const script = document.createElement('script');
    script.setAttribute('data-name', 'BMC-Widget');
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';
    script.setAttribute('data-id', 'sakienter');
    script.setAttribute('data-description', 'Support me on Buy me a coffee!');
    script.setAttribute('data-message', '');
    script.setAttribute('data-color', '#26B0A1');
    script.setAttribute('data-position', 'Right');
    script.setAttribute('data-x_margin', '18');
    script.setAttribute('data-y_margin', '18');
    document.head.appendChild(script);

    return waitForCoffeeWidget();
  };

  const coffeeWidgetReady = loadCoffeeWidget();

  container.querySelector('[data-support-button]')?.addEventListener('click', async () => {
    setStatus('応援画面を準備しています…');
    const widgetButton = await coffeeWidgetReady;

    if (widgetButton) {
      widgetButton.click();
      setStatus('');
      return;
    }

    const popup = window.open(supportUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      setStatus('応援画面を開けませんでした。ポップアップの許可設定をご確認ください。');
    }
  });

  container.querySelector('[data-x-share]')?.addEventListener('click', () => {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}`;
    const popup = window.open(
      shareUrl,
      'stuntdrake-share',
      'noopener,noreferrer,width=720,height=620'
    );

    if (popup) {
      popup.opener = null;
      setStatus('Xの共有画面を開きました。');
    } else {
      setStatus('共有画面を開けませんでした。ポップアップの許可設定をご確認ください。');
    }
  });

  copyButton?.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(pageUrl);
      copyButton.classList.add('is-success');
      setStatus('リンクをコピーしました。');
      window.setTimeout(() => copyButton.classList.remove('is-success'), 1800);
    } catch {
      setStatus('リンクをコピーできませんでした。アドレスバーからコピーしてください。');
    }
  });

  container.querySelector('[data-bookmark-button]')?.addEventListener('click', () => {
    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    const shortcut = /mac|iphone|ipad|ipod/i.test(platform) ? 'Command（⌘）+ D' : 'Ctrl + D';
    window.alert(`このページをブックマークに追加するには、キーボードで ${shortcut} を押してください。`);
  });
})();
