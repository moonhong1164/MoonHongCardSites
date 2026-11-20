/* 카드 모음: 열 사이트의 cards.json 을 불러 한 화면에 모은다.
 * 각 사이트의 cards.json 형식: { deck, deckId, site, count, cards: [{ id, name, image, keywords, meaning, link }] }
 * 한 사이트를 못 불러와도 나머지는 그대로 보여 준다.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  /* 사이트 목록·순서·색은 decks.js (오늘의 카드와 함께 쓴다) */
  const DECKS = window.MoonHongDecks;
  const ACCENT = Object.fromEntries(DECKS.map((d) => [d.deckId, d.accent]));

  /* 리딩 일지: 카드마다 그 카드가 나온 기록을 찾아 둔다.
   * 일지에는 카드 이름이 남는다. 주역만 '48. 수풍정'처럼 번호가 붙어 있어 떼고 맞춘다 */
  const J = window.MoonHongJournal;
  const plain = (name) => String(name).replace(/^\d+\.\s*/, '');
  let seen = new Map();   // 'deckId|이름' → [{ e: 기록, c: 그 기록 속 카드 }]
  function indexJournal() {
    seen = new Map();
    if (!J) return;
    J.all().forEach((e) => e.cards.forEach((c) => {
      const k = `${e.deckId}|${plain(c.name)}`;
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push({ e, c });
    }));
  }
  const readingsOf = (c) => seen.get(`${c.deckId}|${c.name}`) || [];
  const when = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const JOURNAL = 'journal.html';

  let decks = [];   // 불러온 덱 (허브 순서)
  let all = [];     // 모든 카드 + 덱 정보
  let filter = 'all';
  let query = '';

  function cardHTML(c, i) {
    const art = c.image
      ? `<img src="${esc(c.image)}" alt="" loading="lazy" decoding="async">`
      : `<span class="no-art" aria-hidden="true">${esc(c.name.slice(0, 2))}</span>`;
    return `<li><button type="button" class="deck-card" data-i="${i}" style="--accent:${c.accent}">` +
      `<span class="art${c.image ? '' : ' is-blank'}">${art}</span>` +
      `<span class="dc-deck">${esc(c.deck)}</span><strong>${esc(c.name)}</strong>` +
      `<span class="dc-kw">${esc(c.keywords.slice(0, 3).join(' · '))}</span>` +
      (readingsOf(c).length ? `<span class="dc-count">일지 ${readingsOf(c).length}</span>` : '') + '</button></li>';
  }

  function matches(c) {
    if (filter !== 'all' && c.deckId !== filter) return false;
    if (!query) return true;
    return c.hay.includes(query);
  }

  function render() {
    const shown = [];
    all.forEach((c, i) => { if (matches(c)) shown.push(cardHTML(c, i)); });
    $('grid').innerHTML = shown.join('');
    $('empty').hidden = shown.length > 0 || !all.length;
    $('deckFilter').querySelectorAll('.chip').forEach((b) => {
      const on = b.dataset.deck === filter;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (all.length) $('notice').textContent = query || filter !== 'all' ? `${shown.length}장을 찾았습니다.` : `${decks.length}개 사이트, ${all.length}장입니다.`;
  }

  function renderChips() {
    $('deckFilter').innerHTML = [{ deckId: 'all', deck: '전체', count: all.length }, ...decks].map((d) =>
      `<button type="button" class="chip" data-deck="${esc(d.deckId)}" aria-pressed="false">${esc(d.deck)} <span>${d.count}</span></button>`).join('');
  }

  /* 상세 시트 아래쪽: 이 카드가 나온 리딩. 최신 다섯 건까지, 나머지는 일지로 */
  function readingsHTML(c) {
    if (!J) return '';
    const list = readingsOf(c);
    if (!list.length) return '<section class="sheet-log"><h3>리딩 일지</h3><p class="sheet-none">아직 이 카드가 나온 리딩을 저장하지 않았습니다.</p></section>';
    const items = list.slice(0, 5).map(({ e, c: at }) =>
      `<li><a href="${JOURNAL}#e-${esc(e.id)}"><time datetime="${e.createdAt}">${when.format(new Date(e.createdAt))}</time>` +
      `<span class="sl-where">${esc(e.spread || e.deck)}${at.position ? ` · ${esc(at.position)}` : ''}` +
      `${at.orientation ? ` · ${J.ORIENT_KO[at.orientation]}` : ''}</span>` +
      `<span class="sl-q">${e.question ? esc(e.question) : '질문 없이 뽑은 리딩'}</span></a></li>`).join('');
    const more = list.length > 5 ? `<a class="sl-more" href="${JOURNAL}">나머지 ${list.length - 5}건은 리딩 일지에서 →</a>` : '';
    return `<section class="sheet-log"><h3>리딩 일지 <span>${list.length}번 나왔습니다</span></h3><ol>${items}</ol>${more}</section>`;
  }

  function openSheet(c) {
    const art = c.image ? `<img src="${esc(c.image)}" alt="${esc(c.name)} 카드 그림">` : `<span class="no-art">${esc(c.name.slice(0, 2))}</span>`;
    const go = c.link || c.site;
    $('sheetBody').innerHTML =
      `<div class="sheet-head" style="--accent:${c.accent}"><div class="art${c.image ? '' : ' is-blank'}">${art}</div>` +
      `<div><p class="dc-deck">${esc(c.deck)}</p><h2 id="sheetTitle">${esc(c.name)}</h2></div></div>` +
      (c.meaning ? `<p class="sheet-meaning">${esc(c.meaning)}</p>` : '') +
      `<ul class="sheet-kw">${c.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` +
      readingsHTML(c) +
      (go ? `<a class="ghost" href="${esc(go)}">${esc(c.deck)} 사이트에서 보기 →</a>` : '');
    const sheet = $('sheet');
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  $('search').addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    render();
  });
  $('deckFilter').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter = chip.dataset.deck;
    render();
  });
  $('grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.deck-card');
    if (btn) openSheet(all[Number(btn.dataset.i)]);
  });
  $('sheetClose').addEventListener('click', () => $('sheet').close());
  /* 다른 탭(사이트)에서 리딩을 저장하면 표시를 새로 맞춘다 */
  window.addEventListener('storage', (e) => {
    if (!J || e.key !== J.KEY) return;
    indexJournal();
    render();
  });
  $('sheet').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  /* 열 곳을 한꺼번에 불러온다. 실패한 곳은 이름만 알린다 */
  Promise.all(DECKS.map((d) =>
    fetch(d.json, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => ({ ok: true, j }), () => ({ ok: false, id: d.deckId }))
  )).then((res) => {
    const failed = [];
    res.forEach((r) => {
      if (!r.ok || !r.j || !Array.isArray(r.j.cards)) { failed.push(r.id); return; }
      const j = r.j;
      const accent = ACCENT[j.deckId] || 'var(--star)';
      decks.push({ deckId: j.deckId, deck: j.deck, count: j.cards.length });
      j.cards.forEach((c) => {
        const keywords = Array.isArray(c.keywords) ? c.keywords : [];
        all.push({
          id: c.id, name: String(c.name || ''), image: /^https:\/\//.test(c.image || '') ? c.image : null,
          keywords, meaning: c.meaning || '', link: /^https:\/\//.test(c.link || '') ? c.link : null,
          deck: j.deck, deckId: j.deckId, site: /^https:\/\//.test(j.site || '') ? j.site : null, accent,
          hay: [c.name, j.deck, ...keywords, c.meaning || ''].join(' ').toLowerCase()
        });
      });
    });
    indexJournal();
    renderChips();
    render();
    if (failed.length) {
      $('notice').textContent += ` (불러오지 못한 곳: ${failed.join(', ')})`;
      $('notice').classList.add('is-bad');
    }
    if (!all.length) $('notice').textContent = '카드를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.';
  });
})();
