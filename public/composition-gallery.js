(() => {
  const root = document.getElementById('composition-gallery');
  if (!root) return;

  const tabs = document.getElementById('composition-player-tabs');
  const image = document.getElementById('composition-image');
  const placeholder = document.getElementById('composition-placeholder');
  const openLink = document.getElementById('composition-open-link');
  const basePath = root.dataset.basePath || './compositions';

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

    if (cached?.status === 'loaded') {
      displayImage(name, src);
      return;
    }

    root.setAttribute('aria-busy', 'true');

    // 2枚目以降は現在の画像を残したまま裏側で読み込み、完了後に差し替える。
    // これにより、選手を切り替えるたびにプレースホルダーが点滅しない。
    if (image.hidden || !image.getAttribute('src')) {
      placeholder.textContent = '画像を準備中です。';
      placeholder.hidden = false;
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

  scheduleRender(false);
})();
