(() => {
  const hourglass = document.querySelector('.title-cluster .hourglass:not(.reverse)');
  if (!hourglass) return;

  let count = 0;
  let resetTimer;
  const destination = 'https://youtu.be/EKGu_s8o75c?si=dWRo5om68BEEfY2B';

  hourglass.style.cursor = 'pointer';

  hourglass.addEventListener('click', () => {
    count += 1;
    clearTimeout(resetTimer);

    if (count === 3) {
      window.location.href = destination;
      return;
    }

    resetTimer = window.setTimeout(() => {
      count = 0;
    }, 1800);
  });
})();
