function keepCompositionPlaceholderCurrent() {
  const placeholder = document.getElementById('composition-placeholder');
  const tableBody = document.querySelector('#day-points-table tbody');
  if (!placeholder || !tableBody) return;

  const update = () => {
    const hasPlayers = tableBody.querySelectorAll('tr').length > 0;
    if (!hasPlayers && placeholder.textContent !== '未実施') {
      placeholder.textContent = '未実施';
    }
  };

  update();
  new MutationObserver(update).observe(tableBody, { childList: true, subtree: true });
  new MutationObserver(update).observe(placeholder, { childList: true, characterData: true, subtree: true });
  document.getElementById('composition-gallery')?.addEventListener('toggle', () => {
    window.setTimeout(update, 80);
  });
}

function applySeasonPatch(baseData, patchData, dayIndex) {
  if (!baseData || !patchData || typeof patchData !== 'object') return baseData;

  const merged = {
    ...baseData,
    days: Array.isArray(baseData.days) ? [...baseData.days] : []
  };

  if (patchData.updatedAt) merged.updatedAt = patchData.updatedAt;
  if (patchData.summary && typeof patchData.summary === 'object') merged.summary = patchData.summary;
  if (patchData.day && typeof patchData.day === 'object') merged.days[dayIndex] = patchData.day;

  return merged;
}

async function initSeasonTwo() {
  loadedData = createFallbackData();
  renderPage(loadedData);
  keepCompositionPlaceholderCurrent();

  const [resultData, day2Data, staticTribes] = await Promise.all([
    fetchJson(API_URL).catch(error => {
      console.warn('Season 2 static results are not available.', error);
      return null;
    }),
    fetchJson('./results-day2.json').catch(error => {
      console.warn('Season 2 DAY2 results are not available.', error);
      return null;
    }),
    fetchJson(TRIBE_API_URL).catch(error => {
      console.warn('Season 2 static tribe data is not available.', error);
      return null;
    })
  ]);

  if (staticTribes && typeof staticTribes === 'object') {
    tribeConfig = staticTribes;
  }

  if (resultData && typeof resultData === 'object') {
    const patchedData = applySeasonPatch(resultData, day2Data, 1);
    loadedData = normalizeSeasonData(patchedData);
  }

  renderPage(loadedData, true);
}

initSeasonTwo();
