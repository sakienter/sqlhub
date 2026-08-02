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

          <button id="dynamic-scrim-submit" class="scrim-submit" type="submit">参加申請する</button>
          <p id="dynamic-scrim-error" class="scrim-form-error" role="alert"></p>
        </form>
      </div>
    `;

    bindForm();
  }

  function bindForm() {
    const fields = registrationFormFields();

    function showError(message) {
      fields.error.textContent = message;
      fields.error.classList.add('is-visible');
    }

    function clearError() {
      fields.error.textContent = '';
      fields.error.classList.remove('is-visible');
    }

    fields.event.addEventListener('change', () => {
      clearError();
      updateEventDetail(fields.event.value, fields.detail);
    });

    [fields.battleTag, fields.xAccount].forEach((input) => input.addEventListener('input', clearError));

    fields.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearError();
      const submission = registrationSubmission(fields);
      if (submission.error) {
        showError(submission.error);
        submission.focusTarget.focus();
        return;
      }

      setSubmitting(fields.submit, true);

      try {
        const data = await postRegistration(submission.payload);
        renderSubmissionSuccess(submission.payload, data);
      } catch (error) {
        showError(error.message || '送信に失敗しました。もう一度お試しください。');
        setSubmitting(fields.submit, false);
      }
    });
  }

  function registrationFormFields() {
    return {
      form: document.querySelector('#dynamicScrimEntryForm'),
      event: document.querySelector('#dynamic-scrim-event'),
      detail: document.querySelector('#dynamic-scrim-detail'),
      battleTag: document.querySelector('#dynamic-scrim-btag'),
      xAccount: document.querySelector('#dynamic-scrim-x'),
      website: document.querySelector('#dynamic-scrim-website'),
      submit: document.querySelector('#dynamic-scrim-submit'),
      error: document.querySelector('#dynamic-scrim-error')
    };
  }

  function updateEventDetail(eventId, detail) {
    const selected = events.find((event) => event.eventId === eventId);
    if (!selected) {
      detail.textContent = '';
      detail.classList.remove('is-visible');
      return;
    }

    detail.textContent = selected.gatherTime
      ? `集合 ${selected.gatherTime} ／ 開始 ${selected.startTime}`
      : `開始 ${selected.startTime}`;
    detail.classList.add('is-visible');
  }

  function registrationSubmission(fields) {
    const payload = {
      eventId: fields.event.value,
      battleTag: fields.battleTag.value.trim().replace(/＃/g, '#'),
      xAccount: fields.xAccount.value.trim(),
      website: fields.website.value
    };
    if (payload.xAccount && !payload.xAccount.startsWith('@')) payload.xAccount = `@${payload.xAccount}`;
    fields.xAccount.value = payload.xAccount;

    if (!payload.eventId) return { error: '参加日程を選択してください。', focusTarget: fields.event };
    if (!/^[^#\r\n]{1,30}#[0-9]{4,10}$/u.test(payload.battleTag)) {
      return { error: 'BattleTagを「Name#1234」の形式で入力してください。', focusTarget: fields.battleTag };
    }
    if (!/^@[A-Za-z0-9_]{1,20}$/.test(payload.xAccount)) {
      return { error: 'Xアカウントを「@username」の形式で入力してください。', focusTarget: fields.xAccount };
    }
    return { payload, error: '' };
  }

  function setSubmitting(button, submitting) {
    button.disabled = submitting;
    button.textContent = submitting ? '送信しています…' : '参加申請する';
  }

  async function postRegistration(payload) {
    const response = await fetch(REGISTRATIONS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    let data = {};
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(data.error || `送信に失敗しました。（HTTP ${response.status}）`);
    return data;
  }

  function renderSubmissionSuccess(payload, data) {
    const selected = events.find((event) => event.eventId === payload.eventId);
    shell.innerHTML = `
      <div class="scrim-success">
        <div class="scrim-success-mark">✓</div>
        <h3>参加申請を送信しました</h3>
        <p>申請内容を主催者へ送信しました。本人確認のため、XのDMまたはBattle.netのチャットをご確認ください。現時点では参加確定ではありません。</p>
        <div class="scrim-success-detail">
          <div><strong>日程：</strong>${escapeHtml(selected?.displayLabel || data.eventLabel || '')}</div>
          <div><strong>BattleTag：</strong>${escapeHtml(payload.battleTag)}</div>
          <div><strong>X：</strong>${escapeHtml(payload.xAccount)}</div>
          <div><strong>申請番号：</strong>${escapeHtml(data.applicationCode || '')}</div>
        </div>
        <button id="dynamic-scrim-reset" class="scrim-success-reset" type="button">別の日程を申請する</button>
      </div>
    `;

    document.querySelector('#dynamic-scrim-reset')?.addEventListener('click', renderForm);
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
