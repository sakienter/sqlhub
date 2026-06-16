(() => {
  const trigger = document.querySelector('[data-easter-egg="stuntdrake-memo"]');
  if (!trigger) return;

  const requiredClicks = 5;
  const resetDelay = 3000;
  let clicks = 0;
  let resetTimer = null;

  const reset = () => {
    clicks = 0;
    resetTimer = null;
  };

  trigger.addEventListener('click', () => {
    clicks += 1;

    if (resetTimer) window.clearTimeout(resetTimer);

    if (clicks >= requiredClicks) {
      trigger.classList.add('is-unlocked');
      window.setTimeout(() => {
        window.location.assign('/columns/');
      }, 280);
      return;
    }

    resetTimer = window.setTimeout(reset, resetDelay);
  });
})();
