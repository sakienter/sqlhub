(() => {
  const label = document.querySelector('.topseries-title strong');
  if (!label) return;

  const clipUrl = 'https://www.twitch.tv/thundurus__/clip/AverageApatheticPonyRlyTho-bK48iz5Hd4I8bUuF?filter=clips&range=all';
  const nine = document.createElement('span');
  nine.textContent = '#9';
  nine.style.cursor = 'pointer';
  nine.style.touchAction = 'manipulation';

  label.textContent = '#1〜';
  label.appendChild(nine);

  let count = 0;
  let timer = null;

  nine.addEventListener('click', (event) => {
    event.stopPropagation();
    count += 1;
    if (timer) clearTimeout(timer);

    if (count >= 3) {
      count = 0;
      window.open(clipUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    timer = setTimeout(() => {
      count = 0;
    }, 1800);
  });
})();
