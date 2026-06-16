(() => {
  const target = document.querySelector('.archive-hero .accent-red');
  if (!target) return;

  const destination = 'https://www.twitch.tv/k3rsm_/clip/SincereDifferentPorcupineLitty-4kVihp-RvtOE7V_q?filter=clips&range=all&sort=time';
  let count = 0;
  let resetTimer = null;

  target.style.cursor = 'pointer';
  target.style.touchAction = 'manipulation';

  target.addEventListener('click', () => {
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
