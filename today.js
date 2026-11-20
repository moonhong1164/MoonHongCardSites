/* 오늘의 카드: 열 사이트 가운데 한 곳의 cards.json 에서 한 장.
 * 사람마다 다른 카드: 처음 온 브라우저에 무작위 번호(moonhong-today-id)를 하나 저장해 두고,
 * 그 번호와 날짜(이 기기의 날짜)를 섞어 씨앗으로 쓴다. 그래서 같은 사람은 하루 종일 같은 카드,
 * 다른 사람(다른 브라우저)은 다른 카드를 본다. 번호를 저장할 수 없는 브라우저(사생활 보호 창 등)는
 * 날짜만 쓰므로, 그런 사람들끼리는 같은 카드를 본다.
 * 덱을 먼저 고르고 그 덱에서 카드를 고르므로, 장수가 적은 덱(룬 25장)도 열흘에 한 번꼴로 나온다.
 * 필요한 것: decks.js (MoonHongDecks), journal.js (MoonHongJournal, 없으면 저장 버튼만 숨김)
 */
(function () {
  'use strict';
  const box = document.getElementById('today');
  const DECKS = window.MoonHongDecks;
  const J = window.MoonHongJournal;
  if (!box || !DECKS) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const SPREAD = '오늘의 카드';

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;   // 이 기기의 날짜

  /* 날짜 문자열 → 32비트 씨앗(FNV-1a) → 작은 난수 생성기(mulberry32) */
  function seedOf(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 이 브라우저만의 번호. 한 번 만들면 계속 쓴다 */
  function personalId() {
    const KEY = 'moonhong-today-id';
    try {
      let id = localStorage.getItem(KEY);
      if (!/^[0-9a-f]{16}$/.test(id || '')) {
        const r = new Uint32Array(2);
        crypto.getRandomValues(r);
        id = Array.from(r, (x) => x.toString(16).padStart(8, '0')).join('');
        localStorage.setItem(KEY, id);
        if (localStorage.getItem(KEY) !== id) return '';
      }
      return id;
    } catch (err) {
      return '';
    }
  }
  const rand = rng(seedOf(`moonhong-today-${personalId()}-${today}`));
  const deck = DECKS[Math.floor(rand() * DECKS.length)];
  const pickCard = rand();

  const sameDay = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === today; };
  const savedToday = (j, c) => J && J.all().some((e) => e.spread === SPREAD && e.deckId === j.deckId && sameDay(e.createdAt) && e.cards.some((x) => x.name === c.name));

  function render(j, c) {
    const art = /^https:\/\//.test(c.image || '')
      ? `<img src="${esc(c.image)}" alt="${esc(c.name)} 카드 그림">`
      : `<span class="no-art" aria-hidden="true">${esc(c.name.slice(0, 2))}</span>`;
    const site = /^https:\/\//.test(c.link || '') ? c.link : /^https:\/\//.test(j.site || '') ? j.site : null;
    const label = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);
    box.style.setProperty('--accent', deck.accent);
    box.innerHTML =
      `<div class="art${c.image ? '' : ' is-blank'}">${art}</div>` +
      '<div class="today-body">' +
      `<p class="eyebrow">Your Card of the Day · ${esc(label)}</p>` +
      `<p class="today-deck">${esc(j.deck)}</p>` +
      `<h2 id="todayTitle">${esc(c.name)}</h2>` +
      (c.meaning ? `<p class="today-meaning">${esc(c.meaning)}</p>` : '') +
      (c.keywords && c.keywords.length ? `<ul class="sheet-kw">${c.keywords.slice(0, 6).map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : '') +
      '<div class="today-actions">' +
      (J ? '<button type="button" class="solid" id="todaySave">일지에 저장</button>' : '') +
      (site ? `<a class="ghost" href="${esc(site)}">${esc(j.deck)} 사이트로 →</a>` : '') +
      '</div><p class="notice is-quiet" id="todayMsg" role="status" aria-live="polite"></p></div>';
    box.hidden = false;

    const btn = document.getElementById('todaySave');
    if (!btn) return;
    const done = (text) => {
      btn.disabled = true;
      btn.textContent = '저장됨';
      document.getElementById('todayMsg').innerHTML = `${text} <a href="journal.html">리딩 일지 보기</a>`;
    };
    if (savedToday(j, c)) done('오늘의 카드를 이미 일지에 저장했습니다.');
    btn.addEventListener('click', () => {
      const res = J.save({ deck: j.deck, deckId: j.deckId, spread: SPREAD, question: '',
        cards: [{ name: c.name, position: SPREAD, orientation: null }] });
      if (!res.ok) {
        const msg = document.getElementById('todayMsg');
        msg.textContent = res.error;
        msg.classList.add('is-bad');
        return;
      }
      done('리딩 일지에 저장했습니다.');
    });
  }

  /* 고른 덱의 cards.json 하나만 불러온다. 못 불러오면 자리를 비워 둔다 */
  fetch(deck.json, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j) => {
      const cards = Array.isArray(j.cards) ? j.cards.filter((c) => c && c.name) : [];
      if (!cards.length) return;
      render(j, cards[Math.floor(pickCard * cards.length)]);
    })
    .catch(() => {});
})();
