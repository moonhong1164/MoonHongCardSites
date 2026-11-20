/* MoonHong 리딩 일지 — 사이트에 붙이는 '이 리딩 저장' 상자
 * journal.js 다음에 불러온다.
 *   <script src="https://moonhong1164.github.io/MoonHongCardSites/journal.js"></script>
 *   <script src="https://moonhong1164.github.io/MoonHongCardSites/journal-box.js"></script>
 *
 *   const box = MoonHongJournal.box({
 *     deck: '룬', deckId: 'rune',
 *     after: document.getElementById('readings'),      // 이 요소 바로 뒤에 상자를 끼운다
 *     read: () => ({ spread, question, cards: [{ name, position, orientation }] })
 *   });
 *   box.show();  // 리딩을 다 펼쳤을 때 (질문 칸을 read().question 으로 채운다)
 *   box.hide();  // 새로 뽑을 때
 *
 * 모양은 사이트의 색 변수(--star, --line, --mist, --paper, --ink, --leaf, --hong)를 따르고,
 * 사이트 CSS와 부딪히지 않게 클래스는 모두 mhj- 로 시작한다.
 */
(function (root) {
  'use strict';
  const J = root.MoonHongJournal;
  if (!J || J.box) return;

  const JOURNAL_URL = 'https://moonhong1164.github.io/MoonHongCardSites/journal.html';
  const CSS = `
.mhj-box { display: flex; flex-direction: column; gap: 18px; margin: 32px 0 0; padding: 26px; text-align: left;
  border: 1px solid var(--line, #36406a); border-left: 3px solid var(--star, #f2c230); border-radius: 6px;
  background: rgba(20, 26, 54, .7); color: var(--paper, #f3ecdc); }
.mhj-box[hidden] { display: none !important; }
.mhj-box h3 { margin: 0; font-size: 1.2rem; line-height: 1.4; }
.mhj-lead { margin: 0; max-width: 42em; color: var(--mist, #a9b0cf); font-size: .92rem; line-height: 1.7; }
.mhj-field { display: flex; flex-direction: column; gap: 6px; max-width: 42em; }
.mhj-field label { font-size: .95rem; color: var(--mist, #a9b0cf); }
.mhj-field label span { opacity: .7; }
.mhj-box input, .mhj-box textarea { width: 100%; box-sizing: border-box; font: inherit; color: var(--paper, #f3ecdc); }
.mhj-box input { padding: 10px 2px; background: transparent; border: 0; border-bottom: 1px solid var(--line, #36406a); border-radius: 0; }
.mhj-box textarea { padding: 12px 14px; line-height: 1.6; resize: vertical; background: rgba(12, 16, 36, .5); border: 1px solid var(--line, #36406a); border-radius: 6px; }
.mhj-box input::placeholder, .mhj-box textarea::placeholder { color: var(--mist, #a9b0cf); opacity: .55; }
.mhj-box input:focus, .mhj-box textarea:focus { outline: 0; border-color: var(--star, #f2c230); }
.mhj-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.mhj-save, .mhj-link { font: inherit; line-height: 1.3; border-radius: 999px; text-decoration: none; cursor: pointer; }
.mhj-save { padding: 11px 28px; font-weight: 700; color: var(--ink, #0c1024); background: var(--star, #f2c230); border: 1px solid var(--star, #f2c230); }
.mhj-save:hover { filter: brightness(1.08); }
.mhj-save:disabled { opacity: .55; cursor: default; filter: none; }
.mhj-link { padding: 9px 22px; font-size: .95rem; color: var(--paper, #f3ecdc); background: transparent; border: 1px solid var(--line, #36406a); }
.mhj-link:hover { border-color: var(--paper, #f3ecdc); }
.mhj-msg { margin: 0; min-height: 1.5em; font-size: .92rem; color: var(--leaf, #7fc99a); }
.mhj-msg.is-bad { color: var(--hong, #e0566a); }
@media (max-width: 760px) { .mhj-box { padding: 20px 18px; } }
`;

  let seq = 0;
  function addStyle() {
    if (document.getElementById('mhj-style')) return;
    const s = document.createElement('style');
    s.id = 'mhj-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function box(opts) {
    addStyle();
    seq += 1;
    const id = (k) => `mhj-${k}-${seq}`;
    const el = document.createElement('section');
    el.className = 'mhj-box';
    el.hidden = true;
    el.setAttribute('aria-labelledby', id('title'));
    el.innerHTML =
      `<h3 id="${id('title')}">이 리딩 저장</h3>` +
      '<p class="mhj-lead">질문과 메모를 남겨 두면 MoonHong 리딩 일지에서 다시 읽을 수 있습니다. 기록은 이 기기의 이 브라우저에만 남습니다.</p>' +
      `<div class="mhj-field"><label for="${id('q')}">질문</label>` +
      `<input id="${id('q')}" type="text" maxlength="300" autocomplete="off" placeholder="이 리딩에 품었던 질문"></div>` +
      `<div class="mhj-field"><label for="${id('m')}">메모 <span>(선택)</span></label>` +
      `<textarea id="${id('m')}" rows="3" maxlength="4000" placeholder="떠오른 생각, 나중에 확인하고 싶은 점"></textarea></div>` +
      `<div class="mhj-actions"><button type="button" class="mhj-save">이 리딩 저장</button>` +
      `<a class="mhj-link" href="${JOURNAL_URL}">리딩 일지 보기</a></div>` +
      '<p class="mhj-msg" role="status" aria-live="polite"></p>';
    const q = el.querySelector('input');
    const memo = el.querySelector('textarea');
    const btn = el.querySelector('.mhj-save');
    const msg = el.querySelector('.mhj-msg');

    if (opts.after && opts.after.parentNode) opts.after.parentNode.insertBefore(el, opts.after.nextSibling);
    else if (opts.into) opts.into.appendChild(el);

    function say(text, bad) {
      msg.textContent = text;
      msg.classList.toggle('is-bad', !!bad);
    }
    function hide() {
      el.hidden = true;
      btn.disabled = false;
      btn.textContent = '이 리딩 저장';
      say('');
    }
    function show() {
      let r = {};
      try { r = opts.read() || {}; } catch (err) { r = {}; }
      hide();
      q.value = r.question || '';
      memo.value = '';
      el.hidden = false;
    }
    btn.addEventListener('click', () => {
      let r;
      try { r = opts.read(); } catch (err) { r = null; }
      if (!r || !r.cards || !r.cards.length) { say('저장할 리딩이 없습니다. 카드를 모두 펼친 뒤 저장해 주세요.', true); return; }
      const res = J.save({ deck: opts.deck, deckId: opts.deckId, spread: r.spread, cards: r.cards, question: q.value, memo: memo.value });
      if (!res.ok) { say(res.error, true); return; }
      btn.disabled = true;
      btn.textContent = '저장됨';
      say('리딩 일지에 저장했습니다.');
    });

    return { el, show, hide };
  }

  root.MoonHongJournal = Object.freeze(Object.assign({}, J, { box }));
})(window);
