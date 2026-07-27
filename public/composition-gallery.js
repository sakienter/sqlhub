(() => {
  const root = document.getElementById('composition-gallery');
  if (!root) return;

  const playerTabs = document.getElementById('composition-player-tabs');
  const image = document.getElementById('composition-image');
  const placeholder = document.getElementById('composition-placeholder');
  const openLink = document.getElementById('composition-open-link');
  const mainDayTabs = document.getElementById('day-tabs');
  const dayTitle = document.getElementById('day-title');
  const dayPointsBody = document.querySelector('#day-points-table tbody');
  const basePath = root.dataset.basePath || './compositions';
  const isSeasonOne = /\/season1(?:\/|$)/i.test(window.location.pathname);

  if (!playerTabs || !image || !placeholder || !openLink) return;

  const playerSlugs = {
    Alutemu: 'alutemu',
    MATSURI: 'matsuri',
    SeseiSei: 'seseisei',
    Thundurus: 'thundurus',
    Yoshiyuki: 'yoshiyuki',
    'あれっくす': 'arekkusu',
    'ぎゃん': 'gyan',
    jp: 'jp'
  };

  const imageCache = new Map();
  let selectedPlayer = '';
  let displayedDayNumber = 0;
  let displayRequestId = 0;
  let renderTimer = 0;

  const compositionDayTabs = ensureDaySwitcher();

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

    const tabs = document.createElement('div');
    tabs.id = 'composition-day-tabs';
    tabs.className = 'composition-day-tabs';
    tabs.setAttribute('aria-label', 'ページ全体のDAY切り替え');

    switcher.append(label, tabs);
    if (note) note.insertAdjacentElement('afterend', switcher);
    else body.prepend(switcher);

    return tabs;
  }

  function getMainDayButtons() {
    return Array.from(document.querySelectorAll('#day-tabs .day-tab'));
  }

  function getSelectedDayNumber() {
    const activeLabel = document.querySelector('#day-tabs .day-tab.active .tab-main')?.textContent;
    const source = activeLabel || dayTitle?.textContent || 'DAY1';
    const match = source.match(/DAY\s*(\d+)/i);
    return match ? Number(match[1]) : 1;
  }

  function renderDaySwitcher() {
    if (!compositionDayTabs) return;

    const sourceButtons = getMainDayButtons();
    const switcher = compositionDayTabs.closest('.composition-day-switcher');
    if (switcher) switcher.hidden = sourceButtons.length === 0;

    compositionDayTabs.replaceChildren();

    sourceButtons.forEach((sourceButton, index) => {
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
        getMainDayButtons()[index]?.click();
        window.requestAnimationFrame(syncDaySwitcher);
      });

      compositionDayTabs.appendChild(button);
    });

    syncDaySwitcher();
  }

  function syncDaySwitcher() {
    if (!compositionDayTabs) return;

    const activeIndex = getMainDayButtons().findIndex(button => button.classList.contains('active'));
    compositionDayTabs.querySelectorAll('.composition-day-tab').forEach((button, index) => {
      const active = index === activeIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function getPlayers() {
    return Array.from(document.querySelectorAll('#day-points-table tbody tr'))
      .map(row => {
        const cell = row.querySelector('.name-cell') || row.cells?.[0];
        return cell?.textContent?.trim() || '';
      })
      .filter(name => name && name !== 'データがありません');
  }

  function fileBaseName(name) {
    if (playerSlugs[name]) return playerSlugs[name];

    const asciiSlug = name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return asciiSlug || name.trim().replace(/[\\/]/g, '-');
  }

  function imagePathFor(name) {
    const day = getSelectedDayNumber();
    const slug = fileBaseName(name);
    if (isSeasonOne) return `./s1day${day}/${slug}.webp`;
    return `/season2/compositions/day${day}/${slug}.webp?v=20260727-season2-comps-v1`;
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
    players.forEach(name => loadImage(imagePathFor(name)).catch(() => {}));
  }

  function displayImage(name, src) {
    image.src = src;
    image.alt = `${dayTitle?.textContent || ''} ${name} 構成メモ`;
    image.hidden = false;
    placeholder.hidden = true;
    openLink.href = src;
    openLink.hidden = false;
    displayedDayNumber = getSelectedDayNumber();
    root.removeAttribute('aria-busy');
  }

  function updateActivePlayerTab() {
    playerTabs.querySelectorAll('.composition-player-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.player === selectedPlayer);
    });
  }

  function showPlayer(name) {
    if (!name) {
      setPlaceholder('表示できる選手データがありません。');
      return;
    }

    selectedPlayer = name;
    updateActivePlayerTab();

    const src = imagePathFor(name);
    const cached = imageCache.get(src);
    const requestId = ++displayRequestId;
    const selectedDayNumber = getSelectedDayNumber();
    const changingDay = displayedDayNumber > 0 && displayedDayNumber !== selectedDayNumber;

    if (cached?.status === 'loaded') {
      displayImage(name, src);
      return;
    }

    root.setAttribute('aria-busy', 'true');

    if (changingDay || image.hidden || !image.getAttribute('src')) {
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

  function renderPlayerTabs(players) {
    playerTabs.replaceChildren();

    players.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'composition-player-tab';
      button.dataset.player = name;
      button.textContent = name;
      button.addEventListener('click', () => showPlayer(name));
      playerTabs.appendChild(button);
    });
  }

  function renderGallery() {
    renderDaySwitcher();

    const players = getPlayers();
    preloadPlayers(players);

    if (!root.open) return;

    if (!players.length) {
      selectedPlayer = '';
      playerTabs.replaceChildren();
      setPlaceholder('結果データの読み込み後に選手一覧が表示されます。');
      return;
    }

    if (!players.includes(selectedPlayer)) selectedPlayer = players[0];
    renderPlayerTabs(players);
    showPlayer(selectedPlayer);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderGallery, 40);
  }

  root.addEventListener('toggle', () => {
    if (root.open) scheduleRender();
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#day-tabs .day-tab')) scheduleRender();
  });

  const contentObserver = new MutationObserver(scheduleRender);
  [dayTitle, dayPointsBody].filter(Boolean).forEach(target => {
    contentObserver.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });

  if (mainDayTabs) {
    const dayTabsObserver = new MutationObserver(mutations => {
      const structureChanged = mutations.some(mutation => mutation.type === 'childList');
      if (structureChanged) renderDaySwitcher();
      else syncDaySwitcher();
    });

    dayTabsObserver.observe(mainDayTabs, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  scheduleRender();
})();
