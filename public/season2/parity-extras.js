function startLoadingDots() {
  const target = document.getElementById('ld-dots');
  if (!target) return;
  const frames = ['', '.', '..', '...'];
  let index = 0;
  window.s2LoadingTimer = window.setInterval(() => {
    target.textContent = frames[index++ % frames.length];
  }, 400);
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  window.clearInterval(window.s2LoadingTimer);
  overlay.classList.add('hidden');
  window.setTimeout(() => overlay.remove(), 500);
}

function setStatus(text) {
  if (elements.dataStatus) elements.dataStatus.textContent = text;
}

function keepCompositionPlaceholderCurrent() {
  const placeholder = document.getElementById('composition-placeholder');
  const tableBody = document.querySelector('#day-points-table tbody');
  if (!placeholder || !tableBody) return;

  const update = () => {
    const hasPlayers = tableBody.querySelectorAll('tr').length > 0;
    if (!hasPlayers) placeholder.textContent = '未実施';
  };

  update();
  new MutationObserver(update).observe(tableBody, { childList: true, subtree: true });
  new MutationObserver(update).observe(placeholder, { childList: true, characterData: true, subtree: true });
  document.getElementById('composition-gallery')?.addEventListener('toggle', () => {
    window.setTimeout(update, 80);
  });
}

async function initSeasonTwo() {
  startLoadingDots();
  const fallback = createFallbackData();
  loadedData = fallback;
  renderPage(loadedData);
  keepCompositionPlaceholderCurrent();

  const cached = readLocalCache(RESULTS_CACHE_KEY);
  if (cached) {
    loadedData = normalizeSeasonData(cached);
    renderPage(loadedData, true);
    hideLoadingOverlay();
  }

  const tribeRequest = fetchJson(TRIBE_API_URL, { cache: 'default' })
    .then(data => {
      tribeConfig = data && typeof data === 'object' ? data : {};
      renderSelectedGame(selectedGameIndex);
    })
    .catch(error => console.warn('Season 2 tribe data is not available.', error));

  try {
    const data = await fetchJson(API_URL, { cache: 'default' });
    loadedData = normalizeSeasonData(data);
    if (hasResultData(loadedData)) writeLocalCache(RESULTS_CACHE_KEY, data);
    renderPage(loadedData, Boolean(cached));
    setStatus(hasResultData(loadedData) ? '読み込み完了' : '未実施');
  } catch (error) {
    console.warn('Season 2 results are not available.', error);
    if (!cached) {
      loadedData = fallback;
      renderPage(loadedData);
    }
    setStatus('未実施');
  } finally {
    await tribeRequest;
    hideLoadingOverlay();
  }
}

initSeasonTwo();
