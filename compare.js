/* 카드 비교: 질문 하나 → 덱 2~4개 → 덱마다 한 장씩 → 나란히 보기 → 일지에 '비교 리딩' 한 건으로 저장.
 * 필요한 것: decks.js (MoonHongDecks), journal.js (MoonHongJournal, 없으면 저장 버튼만 숨김)
 * 일지 기록 모양: deck '비교 리딩', deckId 'compare', 카드마다 position = 그 카드의 덱 이름.
 * (카드 모음은 이 position 으로 원래 덱을 찾아 '일지에 나온 카드'로 센다)
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const DECKS = window.MoonHongDecks || [];
  const J = window.MoonHongJournal;
  const MIN = 2;
  const MAX = 4;

  const cache = new Map();   // deckId → cards.json (한 번 불러온 덱은 다시 받지 않는다)
  let draw = null;           // { question, picks: [{ deck, j, c }] }
  let saved = false;

  /* ── 덱 고르기 ─────────────────────── */
  $('deckChecks').innerHTML = DECKS.map((d) =>
    `<label class="deck-check" style="--accent:${d.accent}"><input type="checkbox" name="deck" value="${d.deckId}">` +
    `<span>${esc(d.name)}</span></label>`).join('');

  const chosen = () => [...document.querySelectorAll('input[name=deck]:checked')].map((x) => DECKS.find((d) => d.deckId === x.value));
  function syncPicks() {
    const n = chosen().length;
    $('pickCount').textContent = `(${n}개 고름)`;
    $('drawBtn').disabled = n < MIN || n > MAX;
    /* 네 개를 고르면 나머지 칸은 잠근다 */
    document.querySelectorAll('input[name=deck]').forEach((x) => { x.disabled = !x.checked && n >= MAX; });
    $('setupMsg').textContent = n < MIN ? `덱을 ${MIN - n}개 더 고르세요.` : n === MAX ? '네 개까지 고를 수 있습니다.' : '';
  }
  $('deckChecks').addEventListener('change', syncPicks);
  syncPicks();

  function load(d) {
    if (cache.has(d.deckId)) return Promise.resolve(cache.get(d.deckId));
    return fetch(d.json, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(d.name))))
      .then((j) => {
        if (!Array.isArray(j.cards) || !j.cards.length) throw new Error(d.name);
        cache.set(d.deckId, j);
        return j;
      });
  }
  function randomIndex(n) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    return r[0] % n;
  }

  /* ── 뽑기와 보여 주기 ───────────────── */
  function cardHTML({ deck, j, c }, i) {
    const art = /^https:\/\//.test(c.image || '')
      ? `<img src="${esc(c.image)}" alt="${esc(c.name)} 카드 그림">`
      : `<span class="no-art" aria-hidden="true">${esc(String(c.name).slice(0, 2))}</span>`;
    const site = /^https:\/\//.test(c.link || '') ? c.link : /^https:\/\//.test(j.site || '') ? j.site : null;
    const kw = Array.isArray(c.keywords) ? c.keywords.slice(0, 5) : [];
    return `<li class="compare-card" style="--accent:${deck.accent};--d:${i * 140}ms">` +
      `<div class="art${c.image ? '' : ' is-blank'}">${art}</div>` +
      `<p class="dc-deck">${esc(j.deck)}</p><h3>${esc(c.name)}</h3>` +
      (c.meaning ? `<p class="cc-meaning">${esc(c.meaning)}</p>` : '') +
      (kw.length ? `<ul class="sheet-kw">${kw.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : '') +
      (site ? `<a class="cc-link" href="${esc(site)}">${esc(j.deck)} 사이트로 →</a>` : '') + '</li>';
  }

  function render() {
    $('asked').textContent = draw.question ? `“${draw.question}”` : '질문 없이 뽑은 비교 리딩';
    $('row').style.setProperty('--n', draw.picks.length);
    $('row').innerHTML = draw.picks.map(cardHTML).join('');
    $('saveBtn').hidden = !J;
    $('saveBtn').disabled = false;
    $('saveBtn').textContent = '일지에 저장';
    $('saveMsg').textContent = '';
    $('saveMsg').classList.remove('is-bad');
    saved = false;
    $('result').hidden = false;
  }

  function drawFrom(decks, question) {
    $('drawBtn').disabled = true;
    $('againBtn').disabled = true;
    $('setupMsg').textContent = '카드를 불러오는 중입니다…';
    Promise.all(decks.map((d) => load(d).then((j) => ({ deck: d, j, c: j.cards[randomIndex(j.cards.length)] }))))
      .then((picks) => {
        draw = { question, picks };
        $('setupMsg').textContent = '';
        render();
        $('result').scrollIntoView({ block: 'start' });
      })
      .catch((err) => {
        $('setupMsg').textContent = `${err.message || '어느 덱'}의 카드를 불러오지 못했습니다. 잠시 뒤 다시 해 보세요.`;
      })
      .finally(() => {
        syncPicks();
        $('againBtn').disabled = false;
      });
  }

  $('setup').addEventListener('submit', (e) => {
    e.preventDefault();
    const decks = chosen();
    if (decks.length < MIN || decks.length > MAX) return;
    drawFrom(decks, $('question').value.trim());
  });
  $('againBtn').addEventListener('click', () => { if (draw) drawFrom(draw.picks.map((p) => p.deck), draw.question); });

  /* ── 일지에 저장: 결과 전체를 한 건으로 ── */
  $('saveBtn').addEventListener('click', () => {
    if (!J || !draw || saved) return;
    const res = J.save({
      deck: '비교 리딩',
      deckId: 'compare',
      spread: `비교 리딩 · ${draw.picks.map((p) => p.j.deck).join(' · ')}`,
      question: draw.question,
      cards: draw.picks.map((p) => ({ name: p.c.name, position: p.j.deck, orientation: null }))
    });
    const msg = $('saveMsg');
    if (!res.ok) {
      msg.textContent = res.error;
      msg.classList.add('is-bad');
      return;
    }
    saved = true;
    $('saveBtn').disabled = true;
    $('saveBtn').textContent = '저장됨';
    msg.innerHTML = `리딩 일지에 저장했습니다. <a href="journal.html#e-${esc(res.entry.id)}">일지에서 보기</a>`;
  });
})();
