(() => {
  const banner = document.querySelector('main.page-shell > header.hero');
  if (!banner) return;

  const destination = 'https://www.twitch.tv/alutemu_/clip/AgreeableGiantMomPlanking-GoJSb6NT6EjA--75';
  let count = 0;
  let resetTimer = null;

  banner.style.cursor = 'pointer';

  banner.addEventListener('click', (event) => {
    if (event.target.closest('a, button, input, select, textarea, summary')) return;

    count += 1;
    if (resetTimer) window.clearTimeout(resetTimer);

    if (count >= 3) {
      count = 0;
      window.open(destination, '_blank', 'noopener,noreferrer');
      return;
    }

    resetTimer = window.setTimeout(() => {
      count = 0;
    }, 1800);
  });
})();
