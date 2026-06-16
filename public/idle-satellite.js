(() => {
  const idleDelay = 60000;
  const layer = document.querySelector('[data-idle-satellite]');
  if (!layer) return;

  let timer = null;

  const hide = () => {
    layer.classList.remove('is-active');
    layer.setAttribute('aria-hidden', 'true');
  };

  const show = () => {
    if (document.visibilityState !== 'visible') return;
    layer.classList.add('is-active');
    layer.setAttribute('aria-hidden', 'false');
  };

  const restart = () => {
    hide();
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(show, idleDelay);
  };

  ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, restart, { passive: true });
  });

  document.addEventListener('visibilitychange', restart);
  restart();
})();
