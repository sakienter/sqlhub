(() => {
  const clips = {
    final: 'https://www.twitch.tv/alutemu_/clip/SpookyDistinctTitanSmoocherZ-_OVkyKusCfuNcL-k?filter=clips&range=all',
    groupB: 'https://www.twitch.tv/alutemu_/clip/CovertVictoriousCodDancingBanana-qT-oFUNlrj8Y6w-7?filter=clips&range=all'
  };

  const bindTripleClick = (cell, url) => {
    if (!cell) return;
    cell.style.cursor = 'pointer';
    cell.style.touchAction = 'manipulation';

    let clicks = 0;
    let timer = null;

    cell.addEventListener('click', () => {
      clicks += 1;
      if (timer) window.clearTimeout(timer);

      if (clicks >= 3) {
        clicks = 0;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      timer = window.setTimeout(() => {
        clicks = 0;
      }, 1800);
    });
  };

  const cards = [...document.querySelectorAll('.score-card')];
  const finalCard = cards.find((card) => card.querySelector('.section-title')?.textContent.trim() === 'Final Score Board');
  const finalCell = [...(finalCard?.querySelectorAll('tbody td:first-child') || [])]
    .find((cell) => cell.textContent.trim() === 'SeseiSei');

  const groupBHeading = [...document.querySelectorAll('.result-heading')]
    .find((heading) => heading.textContent.includes('Group B'));
  const groupBBlock = groupBHeading?.closest('.result-block');
  const groupBCell = [...(groupBBlock?.querySelectorAll('tbody td:first-child') || [])]
    .find((cell) => cell.textContent.trim() === 'SeseiSei');

  bindTripleClick(finalCell, clips.final);
  bindTripleClick(groupBCell, clips.groupB);
})();
