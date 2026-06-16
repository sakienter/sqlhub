(() => {
  const STORAGE_KEY = 'pinzoro100cc.records.v1';
  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const coinCount = document.querySelector('#coinCount');
  const rollCount = document.querySelector('#rollCount');
  const dice = document.querySelector('#dice');
  const message = document.querySelector('#message');
  const rollButton = document.querySelector('#rollButton');
  const historyEl = document.querySelector('#history');
  const resetButton = document.querySelector('#resetGame');
  const rankingList = document.querySelector('#rankingList');
  const dialog = document.querySelector('#clearDialog');
  const form = document.querySelector('#recordForm');
  const saveRecordButton = document.querySelector('#saveRecord');
  const playerName = document.querySelector('#playerName');
  const clearRolls = document.querySelector('#clearRolls');
  const clearCoins = document.querySelector('#clearCoins');

  let state;

  function initialState() {
    return { coins: 3, rolls: 0, last: null, streak: 0, oneStreak: 0, history: [], cleared: false };
  }

  function resetGame() {
    state = initialState();
    render();
    message.className = 'message';
    message.textContent = '1コインを使ってサイコロを振る。';
  }

  function getRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 20)));
  }

  function renderRanking() {
    const records = getRecords().sort((a, b) => a.rolls - b.rolls || a.createdAt - b.createdAt).slice(0, 10);
    rankingList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'まだ記録はありません。';
      rankingList.append(empty);
      return;
    }
    records.forEach((record, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      const name = document.createElement('strong');
      const score = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = `#${index + 1}`;
      name.textContent = record.name;
      score.textContent = `${record.rolls} ROLLS`;
      item.append(rank, name, score);
      rankingList.append(item);
    });
  }

  function render() {
    coinCount.textContent = state.coins;
    rollCount.textContent = state.rolls;
    rollButton.disabled = state.cleared || state.coins < 1;
    if (!state.history.length) {
      dice.textContent = '–';
      dice.setAttribute('aria-label', 'まだサイコロを振っていません');
      historyEl.textContent = 'まだ振っていません';
    } else {
      const latest = state.history[state.history.length - 1];
      dice.textContent = diceFaces[latest - 1];
      dice.setAttribute('aria-label', `サイコロの出目は${latest}`);
      historyEl.textContent = state.history.slice(-12).join('・');
    }
  }

  function finishGame() {
    state.cleared = true;
    render();
    clearRolls.textContent = state.rolls;
    clearCoins.textContent = state.coins;
    window.setTimeout(() => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
    }, 500);
  }

  function rollDice() {
    if (state.cleared || state.coins < 1) return;
    rollButton.disabled = true;
    dice.classList.remove('rolling');
    void dice.offsetWidth;
    dice.classList.add('rolling');

    window.setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      state.coins -= 1;
      state.rolls += 1;
      state.streak = state.last === result ? state.streak + 1 : 1;
      state.oneStreak = result === 1 ? state.oneStreak + 1 : 0;
      state.last = result;
      state.history.push(result);

      let gained = result;
      let text = `${result}が出た。+${result} COIN`;
      let className = 'message';

      if (state.streak >= 2) {
        gained += result;
        text = `ゾロ目！ ${result}・${result}  BONUS +${result} / 合計 +${gained} COINS`;
        className += ' bonus';
      }

      if (state.oneStreak >= 3) {
        gained += 50;
        text = `ピン・ゾロ！ 1・1・1  SPECIAL BONUS +50 / 合計 +${gained} COINS`;
        className += ' pinzoro';
        state.oneStreak = 0;
      }

      state.coins += gained;
      message.className = className;
      message.textContent = text;
      render();

      if (state.coins >= 100) finishGame();
      else if (state.coins < 1) {
        message.className = 'message';
        message.textContent = 'コインがなくなりました。ゲームをやり直してください。';
      }
    }, 420);
  }

  rollButton.addEventListener('click', rollDice);
  resetButton.addEventListener('click', resetGame);

  form.addEventListener('submit', (event) => {
    if (event.submitter !== saveRecordButton) return;
    event.preventDefault();
    const name = playerName.value.trim().slice(0, 12) || 'PLAYER';
    const records = getRecords();
    records.push({ name, rolls: state.rolls, coins: state.coins, createdAt: Date.now() });
    saveRecords(records.sort((a, b) => a.rolls - b.rolls || a.createdAt - b.createdAt));
    renderRanking();
    dialog.close();
    playerName.value = '';
  });

  renderRanking();
  resetGame();
})();