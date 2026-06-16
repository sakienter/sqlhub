(() => {
  const API_URL = '/api/pinzoro';
  const facePips = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  const faceAngles = {1:{x:0,y:0},2:{x:0,y:-90},3:{x:0,y:-180},4:{x:0,y:90},5:{x:-90,y:0},6:{x:90,y:0}};
  const coinCount = document.querySelector('#coinCount');
  const rollCount = document.querySelector('#rollCount');
  const dice = document.querySelector('#dice');
  const diceStage = document.querySelector('#diceStage');
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
  let rotationX = -24;
  let rotationY = -32;

  function buildFaces() {
    dice.querySelectorAll('.dice-face').forEach((face, index) => {
      const value = index + 1;
      face.setAttribute('aria-label', `${value}の面`);
      for (let i = 1; i <= 9; i += 1) {
        const pip = document.createElement('span');
        pip.className = `pip${facePips[value].includes(i) ? ' show' : ''}`;
        face.appendChild(pip);
      }
    });
  }

  function setCube(x, y) {
    rotationX = x;
    rotationY = y;
    dice.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
  }

  async function animateRollTo(value) {
    const angle = faceAngles[value];
    diceStage.classList.add('is-rolling');
    const animation = dice.animate([
      { transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`, offset: 0 },
      { transform: `rotateX(${rotationX - 42}deg) rotateY(${rotationY + 56}deg)`, offset: .16 },
      { transform: `rotateX(${angle.x + 720}deg) rotateY(${angle.y + 810}deg)`, offset: .58 },
      { transform: `rotateX(${angle.x + 126}deg) rotateY(${angle.y - 96}deg)`, offset: .82 },
      { transform: `rotateX(${angle.x - 14}deg) rotateY(${angle.y + 10}deg)`, offset: .92 },
      { transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)`, offset: 1 }
    ], { duration: 1150, easing: 'cubic-bezier(.18,.72,.2,1)', fill: 'forwards' });
    await animation.finished.catch(() => undefined);
    dice.getAnimations().forEach((item) => item.cancel());
    setCube(angle.x, angle.y);
    diceStage.classList.remove('is-rolling');
    dice.setAttribute('aria-label', `サイコロの出目は${value}`);
  }

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
      setCube(-24, -32);
      dice.setAttribute('aria-label', 'まだサイコロを振っていません');
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
    historyEl.textContent = state.history.length ? state.history.join('・') : 'まだ振っていません';
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

    try {
      const data = await api('POST', { action: 'roll', token: state.token });
      await animateRollTo(data.result);
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
      diceStage.classList.remove('is-rolling');
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

  buildFaces();
  setCube(-24, -32);
  loadRanking();
  resetGame();
})();