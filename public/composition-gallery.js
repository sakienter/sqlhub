(() => {
  const root = document.getElementById('composition-gallery');
  if (!root) return;

  const tabs = document.getElementById('composition-player-tabs');
  const image = document.getElementById('composition-image');
  const placeholder = document.getElementById('composition-placeholder');
  const openLink = document.getElementById('composition-open-link');
  const mainDayTabs = document.getElementById('day-tabs');
  const basePath = root.dataset.basePath || './compositions';

  ensureDaySwitcherStyles();
  const compositionDayTabs = ensureDaySwitcher();

  const knownFileNames = {
    Alutemu: 'alutemu',
    MATSURI: 'matsuri',
    SeseiSei: 'seseisei',
    Thundurus: 'thundurus',
    Yoshiyuki: 'yoshiyuki',
    'あれっくす': 'arekkusu',
    'ぎゃん': 'gyan',
    jp: 'jp'
  };

  const dayOneImagePaths = {
    Alutemu: './s1day1/Alutemu.webp',
    MATSURI: './s1day1/MATSURI_page-0001.webp',
    SeseiSei: './s1day1/SeseiSei_page-0001.webp',
    Thundurus: './s1day1/Thundurus_page-0001.webp',
    Yoshiyuki: './s1day1/yoshiyuki_page-0001.webp',
    'あれっくす': './s1day1/Alex_page-0001.webp',
    'ぎゃん': './s1day1/gyan_page-0001.webp',
    jp: './s1day1/jp_page-0001.webp'
  };

  const imageCache = new Map();
  let selectedPlayer = '';
  let renderTimer = 0;
  let displayRequestId = 0;
  let displayedDayNumber = 0;

  function ensureDaySwitcherStyles() {
    if (document.getElementById('composition-day-switcher-styles')) return;

    const style = document.createElement('style');
    style.id = 'composition-day-switcher-styles';
    style.textContent = `
      .composition-day-switcher {
        margin: 0 0 16px;
        padding: 12px 14px 14px;
        background: rgba(255, 250, 242, 0.66);
        border: 1px solid rgba(24, 33, 40, 0.12);
        border-radius: var(--radius-md);
      }

      .composition-day-label {
        margin: 0 0 9px;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.02em;
        text-align: center;
      }

      .composition-day-tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      .composition-day-tab {
        appearance: none;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        min-height: 48px;
        padding: 7px 10px;
        color: var(--text-secondary);
        background: #fffaf2;
        border: 1px solid rgba(24, 33, 40, 0.16);
        border-radius: var(--radius-sm);
        font-family: var(--font);
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }

      .composition-day-tab:hover {
        color: var(--crimson-dark);
        background: rgba(201, 75, 75, 0.06);
        border-color: rgba(201, 75, 75, 0.34);
      }

      .composition-day-tab.active {
        color: var(--crimson-dark);
        background: rgba(201, 75, 75, 0.1);
        border-color: rgba(201, 75, 75, 0.42);
        box-shadow: inset 0 -3px 0 var(--crimson);
      }

      .composition-day-tab .tab-main {
        font-size: 14px;
        font-weight: 900;
        line-height: 1.1;
      }

      .composition-day-tab .tab-sub {
        font-size: 11px;
        font-weight: 700;
        line-height: 1.1;
        opacity: 0.82;
      }

      @media (max-width: 760px) {
        .composition-day-tabs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDaySwitcher() {
    const existing = document.getElementById('composition-day-tabs');
    if (existing) return existing;

    const body = root.querySelector('.composition-body');
    if (!body) return null;

    const note = body.querySelector('.composition-note');
    if (note) note.textContent = 'DAYと選手名を選ぶと、その日の構成メモを表示します。';

    const switcher = document.createElement('div');
    switcher.className = 'composition-day-switcher';

    const label = document.createElement('p');
    label.className = 'composition-day-label';
    label.textContent = 'DAY / 開催日';

    const dayTabs = document.createElement('div');
    dayTabs.id = 'composition-day-tabs';
    dayTabs.className = 'composition-day-tabs';
    dayTabs.setAttribute('aria-label', 'ページ全体のDAY切り替え');

    switcher.append(label, dayTabs);

    if (note) {
      note.insertAdjacentElement('afterend', switcher);
    } else {
      body.prepend(switcher);
    }

    return dayTabs;
  }

  function getMainDayButtons() {
    return Array.from(document.querySelectorAll('#day-tabs .day-tab'));
  }

  function createDayTabButton(sourceButton, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'composition-day-tab';
    button.dataset.dayIndex = String(index);

    const main = document.createElement('span');
    main.className = 'tab-main';
    main.textContent = sourceButton.querySelector('.tab-main')?.textContent?.trim() || `DAY${index + 1}`;

    const sub = document.createElement('span');
    sub.className = 'tab-sub';
    sub.textContent = sourceButton.querySelector('.tab-sub')?.textContent?.trim() || '';

    button.append(main, sub);
    button.addEventListener('click', () => {
      const target = getMainDayButtons()[index];
      if (!target) return;
      target.click();
      window.requestAnimationFrame(syncCompositionDayTabs);
    });

    return button;
  }

  function renderCompositionDayTabs() {
    if (!compositionDayTabs) return;

    const sourceButtons = getMainDayButtons();
    const switcher = compositionDayTabs.closest('.composition-day-switcher');
    if (switcher) switcher.hidden = sourceButtons.length === 0;

    compositionDayTabs.innerHTML = '';
    sourceButtons.forEach((sourceButton, index) => {
      compositionDayTabs.appendChild(createDayTabButton(sourceButton, index));
    });
    syncCompositionDayTabs();
  }

  function syncCompositionDayTabs() {
    if (!compositionDayTabs) return;

    const activeIndex = getMainDayButtons().findIndex(button => button.classList.contains('active'));
    compositionDayTabs.querySelectorAll('.composition-day-tab').forEach((button, index) => {
      const active = index === activeIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function getSelectedDayNumber() {
    const activeTab = document.querySelector('#day-tabs .day-tab.active .tab-main');
    const dayTitle = document.getElementById('day-title');
    const source = activeTab?.textContent || dayTitle?.textContent || 'DAY1';
    const match = source.match(/DAY\s*(\d+)/i);
    return match ? Number(match[1]) : 1;
  }

  function getPlayers() {
    const rows = document.querySelectorAll('#day-points-table tbody tr');
    return Array.from(rows)
      .map(row => {
        const cell = row.querySelector('.name-cell') || row.cells?.[0];
        return cell?.textContent?.trim() || '';
      })
      .filter(name => name && name !== 'データがありません');
  }

  function fileBaseName(name) {
    if (knownFileNames[name]) return knownFileNames[name];

    const asciiSlug = name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return asciiSlug || name.trim().replace(/[\\/]/g, '-');
  }

  function imagePathFor(name) {
    const day = getSelectedDayNumber();
    if (day === 1 && dayOneImagePaths[name]) return dayOneImagePaths[name];
    return `${basePath}/day${day}/${fileBaseName(name)}.jpg`;
  }

  function setPlaceholder(message) {
    image.hidden = true;
    image.removeAttribute('src');
    openLink.hidden = true;
    openLink.removeAttribute('href');
    placeholder.textContent = message;
    placeholder.hidden = false;
    displayedDayNumber = 0;
    root.removeAttribute('aria-busy');
  }

  function loadImage(src) {
    const cached = imageCache.get(src);
    if (cached) return cached.promise;

    const entry = {
      status: 'loading',
      image: new Image(),
      promise: null
    };

    entry.image.decoding = 'async';
    entry.promise = new Promise((resolve, reject) => {
      entry.image.onload = () => {
        const finish = () => {
          entry.status = 'loaded';
          resolve(entry);
        };

        if (typeof entry.image.decode === 'function') {
          entry.image.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };

      entry.image.onerror = () => {
        entry.status = 'error';
        reject(new Error(`Failed to load composition image: ${src}`));
      };

      entry.image.src = src;
    });

    entry.promise.catch(() => {});
    imageCache.set(src, entry);
    return entry.promise;
  }

  function preloadPlayers(players) {
    players.forEach(name => {
      loadImage(imagePathFor(name)).catch(() => {});
    });
  }

  function displayImage(name, src) {
    image.src = src;
    image.alt = `${document.getElementById('day-title')?.textContent || ''} ${name} 構成メモ`;
    image.hidden = false;
    placeholder.hidden = true;
    openLink.href = src;
    openLink.hidden = false;
    displayedDayNumber = getSelectedDayNumber();
    root.removeAttribute('aria-busy');
  }

  function showPlayer(name) {
    if (!name) {
      setPlaceholder('表示できる選手データがありません。');
      return;
    }

    selectedPlayer = name;
    tabs.querySelectorAll('.composition-player-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.player === name);
    });

    const src = imagePathFor(name);
    const cached = imageCache.get(src);
    const requestId = ++displayRequestId;
    const selectedDayNumber = getSelectedDayNumber();
    const isChangingDay = displayedDayNumber > 0 && displayedDayNumber !== selectedDayNumber;

    if (cached?.status === 'loaded') {
      displayImage(name, src);
      return;
    }

    root.setAttribute('aria-busy', 'true');

    // 同じDAY内の選手切り替えでは現在の画像を残したまま裏側で読み込む。
    // DAYを変えた場合は、別日の画像が残らないようにプレースホルダーへ切り替える。
    if (isChangingDay || image.hidden || !image.getAttribute('src')) {
      image.hidden = true;
      placeholder.textContent = '画像を準備中です。';
      placeholder.hidden = false;
      openLink.hidden = true;
    } else {
      placeholder.hidden = true;
    }

    loadImage(src)
      .then(() => {
        if (requestId !== displayRequestId || selectedPlayer !== name) return;
        displayImage(name, src);
      })
      .catch(() => {
        if (requestId !== displayRequestId || selectedPlayer !== name) return;
        setPlaceholder(`${name} の構成画像はまだ登録されていません。`);
      });
  }

  function renderGallery() {
    renderCompositionDayTabs();

    const players = getPlayers();

    // 結果データが表示された時点で、そのDAYの画像を先読みする。
    preloadPlayers(players);

    if (!root.open) return;

    tabs.innerHTML = '';

    if (!players.length) {
      selectedPlayer = '';
      setPlaceholder('結果データの読み込み後に選手一覧が表示されます。');
      return;
    }

    players.forEach((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'composition-player-tab';
      button.dataset.player = name;
      button.textContent = name;
      button.addEventListener('click', () => showPlayer(name));
      tabs.appendChild(button);

      if (index === 0 && !players.includes(selectedPlayer)) selectedPlayer = name;
    });

    if (!players.includes(selectedPlayer)) selectedPlayer = players[0];
    showPlayer(selectedPlayer);
  }

  function scheduleRender(resetPlayer = false) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      if (resetPlayer) selectedPlayer = '';
      renderGallery();
    }, 40);
  }

  root.addEventListener('toggle', () => {
    if (root.open) scheduleRender(false);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#day-tabs .day-tab')) scheduleRender(true);
  });

  const observerTargets = [
    document.getElementById('day-title'),
    document.querySelector('#day-points-table tbody')
  ].filter(Boolean);

  const observer = new MutationObserver(() => scheduleRender(true));
  observerTargets.forEach(target => observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true
  }));

  if (mainDayTabs) {
    const dayTabsObserver = new MutationObserver(mutations => {
      const structureChanged = mutations.some(mutation => mutation.type === 'childList');
      if (structureChanged) {
        renderCompositionDayTabs();
      } else {
        syncCompositionDayTabs();
      }
    });

    dayTabsObserver.observe(mainDayTabs, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  scheduleRender(false);
})();
