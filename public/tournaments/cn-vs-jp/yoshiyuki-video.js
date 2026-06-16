(() => {
  const names = [...document.querySelectorAll('.player-grid .player-name')];
  const target = names.find((node) => node.textContent.trim() === 'yoshiyuki');
  if (!target) return;

  const card = target.closest('.player-card') || target;
  card.classList.add('video-trigger');

  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="video-dialog" role="dialog" aria-modal="true" aria-label="動画プレイヤー">
      <button type="button" class="video-close" aria-label="閉じる">×</button>
      <video class="video-player" src="./yo.mp4" controls playsinline preload="metadata"></video>
    </div>`;
  document.body.appendChild(modal);

  const video = modal.querySelector('.video-player');
  const closeButton = modal.querySelector('.video-close');
  let count = 0;
  let timer = null;

  const close = () => {
    video.pause();
    modal.hidden = true;
  };

  const open = () => {
    modal.hidden = false;
    video.currentTime = 0;
    video.play().catch(() => {});
    closeButton.focus();
  };

  card.addEventListener('click', () => {
    count += 1;
    if (timer) clearTimeout(timer);

    if (count >= 3) {
      count = 0;
      open();
      return;
    }

    timer = setTimeout(() => {
      count = 0;
    }, 1800);
  });

  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
})();
