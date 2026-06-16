(() => {
  const EVENTS_API = '/api/scrims/events';
  const REGISTRATIONS_API = '/api/scrims/registrations';
  const shell = document.querySelector('.scrim-entry-shell');
  if (!shell) return;

  let events = [];

  function renderLoading() {
    shell.innerHTML = '<div class="scrim-loading">開催日程を読み込んでいます。</div>';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderForm() {
    const options = events.map((event) => (
      `<option value="${escapeHtml(event.eventId)}">${escapeHtml(event.displayLabel)}</option>`
    )).join('');

    shell.innerHTML = `
      <div class="scrim-application">
        <div class="scrim-application-head">
          <div>
            <p class="scrim-application-kicker">SCRIM ENTRY</p>
            <h3 class="scrim-application-title">スクリム参加申請</h3>
            <p class="scrim-application-description">参加日程を選び、BattleTagとXアカウントを入力してください。<br>申請後は、本人確認を行うため、XのDMを受信できる状態にしておいてください。または、Battle.netのチャットをご確認ください。</p>
          </div>
          <span class="scrim-application-status">受付中</span>
        </div>

        <form id="dynamicScrimEntryForm" class="scrim-form-grid" novalidate>
          <div class="scrim-field scrim-field--full">
            <label class="scrim-field-label" for="dynamic-scrim-event">参加日程<span class="scrim-required">必須</span></label>
            <div class="scrim-event-select-wrap">
              <select id="dynamic-scrim-event" class="scrim-event-select" required>
                <option value="">日程を選択してください</option>
                ${options}
              </select>
            </div>
            <p id="dynamic-scrim-detail" class="scrim-event-detail"></p>
          </div>

          <div class="scrim-field">
            <label class="scrim-field-label" for="dynamic-scrim-btag">BattleTag<span class="scrim-required">必須</span></label>
            <input id="dynamic-scrim-btag" class="scrim-input" type="text" maxlength="40" placeholder="Name#1234" autocomplete="off" required />
            <p class="scrim-field-help">「#」と数字部分を含めて入力してください。</p>
          </div>

          <div class="scrim-field">
            <label class="scrim-field-label" for="dynamic-scrim-x">Xアカウント<span class="scrim-required">必須</span></label>
            <input id="dynamic-scrim-x" class="scrim-input" type="text" maxlength="30" placeholder="@username" autocomplete="off" autocapitalize="none" required />
            <p class="scrim-field-help">@から始まるユーザー名を入力してください。</p>
          </div>

          <div class="scrim-honeypot" aria-hidden="true">
            <label for="dynamic-scrim-website">Website</label>
            <input id="dynamic-scrim-website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <p class="scrim-form-note">各回3GAME・合計ポイント制です。申請後に主催者が確認するため、このフォームの送信だけでは参加確定になりません。</p>
          <button id="dynamic-scrim-submit" class="scrim-submit" type="submit">参加申請する</button>
          <p id="dynamic-scrim-error" class="scrim-form-error" role="alert"></p>
        </form>
      </div>
    `;

    bindForm();
  }

  function bindForm() {
    const form = document.querySelector('#dynamicScrimEntryForm');
    const eventSelect = document.querySelector('#dynamic-scrim-event');
    const detail = document.querySelector('#dynamic-scrim-detail');
    const battleTagInput = document.querySelector('#dynamic-scrim-btag');
    const xInput = document.querySelector('#dynamic-scrim-x');
    const websiteInput = document.querySelector('#dynamic-scrim-website');
    const submitButton = document.querySelector('#dynamic-scrim-submit');
    const errorElement = document.querySelector('#dynamic-scrim-error');

    function showError(message) {
      errorElement.textContent = message;
      errorElement.classList.add('is-visible');
    }

    function clearError() {
      errorElement.textContent = '';
      errorElement.classList.remove('is-visible');
    }

    eventSelect.addEventListener('change', () => {
      clearError();
      const selected = events.find((event) => event.eventId === eventSelect.value);
      if (!selected) {
        detail.textContent = '';
        detail.classList.remove('is-visible');
        return;
      }

      detail.textContent = selected.gatherTime
        ? `集合 ${selected.gatherTime} ／ 開始 ${selected.startTime}`
        : `開始 ${selected.startTime}`;
      detail.classList.add('is-visible');
    });

    [battleTagInput, xInput].forEach((input) => input.addEventListener('input', clearError));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearError();

      const eventId = eventSelect.value;
      const battleTag = battleTagInput.value.trim().replace(/＃/g, '#');
      let xAccount = xInput.value.trim();
      if (xAccount && !xAccount.startsWith('@')) xAccount = `@${xAccount}`;
      xInput.value = xAccount;

      if (!eventId) {
        showError('参加日程を選択してください。');
        eventSelect.focus();
        return;
      }
      if (!/^[^#\r\n]{1,30}#[0-9]{4,10}$/u.test(battleTag)) {
        showError('BattleTagを「Name#1234」の形式で入力してください。');
        battleTagInput.focus();
        return;
      }
      if (!/^@[A-Za-z0-9_]{1,20}$/.test(xAccount)) {
        showError('Xアカウントを「@username」の形式で入力してください。');
        xInput.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = '送信しています…';

      try {
        const response = await fetch(REGISTRATIONS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            battleTag,
            xAccount,
            website: websiteInput.value
          }),
          cache: 'no-store'
        });

        let data = {};
        try { data = await response.json(); } catch { data = {}; }
        if (!response.ok) throw new Error(data.error || `送信に失敗しました。（HTTP ${response.status}）`);

        const selected = events.find((event) => event.eventId === eventId);
        shell.innerHTML = `
          <div class="scrim-success">
            <div class="scrim-success-mark">✓</div>
            <h3>参加申請を送信しました</h3>
            <p>申請内容を主催者へ送信しました。本人確認のため、XのDMまたはBattle.netのチャットをご確認ください。現時点では参加確定ではありません。</p>
            <div class="scrim-success-detail">
              <div><strong>日程：</strong>${escapeHtml(selected?.displayLabel || data.eventLabel || '')}</div>
              <div><strong>BattleTag：</strong>${escapeHtml(battleTag)}</div>
              <div><strong>X：</strong>${escapeHtml(xAccount)}</div>
              <div><strong>申請番号：</strong>${escapeHtml(data.applicationCode || '')}</div>
            </div>
            <button id="dynamic-scrim-reset" class="scrim-success-reset" type="button">別の日程を申請する</button>
          </div>
        `;

        document.querySelector('#dynamic-scrim-reset')?.addEventListener('click', renderForm);
      } catch (error) {
        showError(error.message || '送信に失敗しました。もう一度お試しください。');
        submitButton.disabled = false;
        submitButton.textContent = '参加申請する';
      }
    });
  }

  async function loadEvents() {
    renderLoading();

    try {
      const response = await fetch(EVENTS_API, { cache: 'no-store' });
      let data = {};
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) throw new Error(data.error || `開催日程を読み込めませんでした。（HTTP ${response.status}）`);

      events = Array.isArray(data.events) ? data.events : [];
      if (events.length === 0) {
        shell.innerHTML = '<div class="scrim-loading">現在、参加申請を受け付けている日程はありません。</div>';
        return;
      }

      renderForm();
    } catch (error) {
      shell.innerHTML = `<div class="scrim-loading">${escapeHtml(error.message || '開催日程を読み込めませんでした。')}</div>`;
    }
  }

  loadEvents();
})();