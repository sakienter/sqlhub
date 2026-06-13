(() => {
  const section = document.getElementById('current-season');
  const sectionTitle = document.getElementById('current-season-title');
  const cardTitle = document.getElementById('current-season-card-title');
  const subtitle = document.getElementById('current-season-subtitle');
  const cta = document.getElementById('current-season-cta');

  if (!section || !sectionTitle || !cardTitle || !subtitle || !cta) return;

  const getJapanDateKey = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const today = getJapanDateKey();
  const openingDay = '2026-06-27';
  const finalDay = '2026-07-25';

  let state;

  if (today < openingDay) {
    state = {
      name: 'upcoming',
      sectionTitle: '開幕予定のシーズン！',
      cardTitle: 'S級リーグ Season 2 — 6/27 開幕！',
      subtitle: '試合速報・ポイント状況は開幕後にこちらから確認できます。',
      cta: '大会概要を見る →'
    };
  } else if (today <= finalDay) {
    state = {
      name: 'live',
      sectionTitle: '開催中のシーズン！',
      cardTitle: '開催中！ S級リーグ Season 2',
      subtitle: '試合速報、ポイント状況はコチラ！',
      cta: 'ページを見る →'
    };
  } else {
    state = {
      name: 'archived',
      sectionTitle: 'Season 2 結果',
      cardTitle: 'S級リーグ Season 2',
      subtitle: '総合結果と各DAY・各GAMEの試合結果を掲載しています。',
      cta: 'Season 2 結果を見る →'
    };
  }

  section.dataset.seasonState = state.name;
  sectionTitle.textContent = state.sectionTitle;
  cardTitle.textContent = state.cardTitle;
  subtitle.textContent = state.subtitle;
  cta.textContent = state.cta;
})();
