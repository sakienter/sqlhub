(() => {
  const API_URL = '/api/pinzoro';
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

  let state = { token: '', coins: 3, rolls: 0, history: [], cleared: false };
  let busy = false;

  async function api(method = 'GET', body) {
    const response = await fetch(API_URL, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'API_ERROR');
    return data;
  }

  function setError(text) {
    message.className = 'message';
    message.textContent = text;
  }

  async function resetGame() {
    if (busy) return;
    busy = true;
    rollButton.disabled = true;
    setError('ゲームを準備しています…');
    try {
      state = await api('POST', { action: 'start' });
      message.className = 'message';
      message.textContent = '1コインを使ってサイコロを振る。';
      render();
    } catch (error) {
      console.error(error);
      setError('ゲームを開始できませんでした。D1設定を確認してください。');
    } finally {
      busy = false;
      render();
    }
  }

  function renderRanking(records = []) {
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

  async function loadRanking() {
    try {
      const data = await api();
      renderRanking(data.ranking || []);
    } catch (error) {
      console.error(error);
      renderRanking([]);
    }
  }

  function render() {
    coinCount.textContent = state.coins;
    rollCount.textContent = state.rolls;
    rollButton.disabled = busy || !state.token || state.cleared || state.coins < 1;
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
    clearRolls.textContent = state.rolls;
    clearCoins.textContent = state.coins;
    window.setTimeout(() => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
    }, 500);
  }

  async function rollDice() {
    if (busy || state.cleared || state.coins < 1) return;
    busy = true;
    render();
    dice.classList.remove('rolling');
    void dice.offsetWidth;
    dice.classList.add('rolling');

    try {
      const data = await api('POST', { action: 'roll', token: state.token });
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      state = { ...state, ...data };

      let text = `${data.result}が出た。+${data.gained} COIN`;
      let className = 'message';
      if (data.bonus) {
        text = `ゾロ目！ BONUS +${data.bonus} / 合計 +${data.gained} COINS`;
        className += ' bonus';
      }
      if (data.pinzoroBonus) {
        text = `ピン・ゾロ！ 1・1・1  SPECIAL BONUS +50 / 合計 +${data.gained} COINS`;
        className += ' pinzoro';
      }
      message.className = className;
      message.textContent = text;
      if (state.cleared) finishGame();
    } catch (error) {
      console.error(error);
      setError(error.message === 'NO_COINS'
        ? 'コインがなくなりました。ゲームをやり直してください。'
        : '通信に失敗しました。もう一度お試しください。');
    } finally {
      busy = false;
      render();
    }
  }

  rollButton.addEventListener('click', rollDice);
  resetButton.addEventListener('click', resetGame);

  form.addEventListener('submit', async (event) => {
    if (event.submitter !== saveRecordButton) return;
    event.preventDefault();
    saveRecordButton.disabled = true;
    try {
      const data = await api('POST', {
        action: 'submit',
        token: state.token,
        name: playerName.value,
      });
      renderRanking(data.ranking || []);
      dialog.close();
      playerName.value = '';
    } catch (error) {
      console.error(error);
      setError('ランキング登録に失敗しました。');
    } finally {
      saveRecordButton.disabled = false;
    }
  });

  loadRanking();
  resetGame();
})();