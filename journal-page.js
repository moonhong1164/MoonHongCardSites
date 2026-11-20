/* 리딩 일지 화면: 최신순 목록, 덱별 필터, 개별 삭제, 백업 내보내기·가져오기 */
(function () {
  'use strict';
  const J = window.MoonHongJournal;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* 덱마다 허브의 문 색을 그대로 쓴다. 모르는 덱은 별빛색 */
  const ACCENT = {
    oshozen: 'var(--leaf)', belline: 'var(--star)', symbolon: 'var(--violet)', tarot: 'var(--hong)',
    lenormand: 'var(--rose)', kipper: '#8fc3ea', iching: '#e3b65a', color: '#f08fb4', trump: '#e0566a', rune: 'var(--ice)'
  };
  let filter = 'all';

  const fmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });

  function say(text, bad) {
    $('notice').textContent = text;
    $('notice').classList.toggle('is-bad', !!bad);
  }

  function entryHTML(e) {
    const cards = e.cards.map((c) =>
      `<li>${c.position ? `<span class="c-pos">${esc(c.position)}</span>` : ''}<b>${esc(c.name)}</b>` +
      `${c.orientation ? `<span class="c-ori is-${c.orientation}">${J.ORIENT_KO[c.orientation]}</span>` : ''}</li>`).join('');
    return `<li class="entry" style="--accent:${ACCENT[e.deckId] || 'var(--star)'}" data-id="${esc(e.id)}">` +
      `<div class="entry-head"><span class="deck">${esc(e.deck)}</span>${e.spread ? `<span class="spread">${esc(e.spread)}</span>` : ''}` +
      `<time datetime="${e.createdAt}">${fmt.format(new Date(e.createdAt))}</time></div>` +
      `<p class="q${e.question ? '' : ' is-none'}">${e.question ? esc(e.question) : '질문 없이 뽑은 리딩'}</p>` +
      `<ol class="drawn">${cards}</ol>` +
      (e.memo ? `<p class="memo">${esc(e.memo)}</p>` : '') +
      `<div class="entry-foot">${e.site ? `<a href="${esc(e.site)}">${esc(e.deck)} 사이트로</a>` : ''}` +
      `<button type="button" class="del" data-del="${esc(e.id)}">삭제</button></div></li>`;
  }

  function render() {
    const list = J.all();
    const decks = [];
    list.forEach((e) => { if (!decks.some((d) => d.id === e.deckId)) decks.push({ id: e.deckId, name: e.deck }); });
    if (filter !== 'all' && !decks.some((d) => d.id === filter)) filter = 'all';

    $('deckFilter').innerHTML = [{ id: 'all', name: '전체' }, ...decks].map((d) => {
      const n = d.id === 'all' ? list.length : list.filter((e) => e.deckId === d.id).length;
      const on = d.id === filter;
      return `<button type="button" class="chip${on ? ' is-on' : ''}" data-deck="${esc(d.id)}" aria-pressed="${on}">${esc(d.name)} <span>${n}</span></button>`;
    }).join('');
    $('deckFilter').hidden = !list.length;
    $('exportBtn').disabled = !list.length;

    const shown = filter === 'all' ? list : list.filter((e) => e.deckId === filter);
    $('entries').innerHTML = shown.map(entryHTML).join('');
    $('empty').hidden = list.length > 0;
  }

  $('deckFilter').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter = chip.dataset.deck;
    render();
  });

  $('entries').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const entry = J.all().find((x) => x.id === btn.dataset.del);
    const label = entry ? `${entry.deck} · ${fmt.format(new Date(entry.createdAt))}` : '이 기록';
    if (!confirm(`${label}\n이 리딩을 지울까요? 지운 기록은 되돌릴 수 없습니다.`)) return;
    const res = J.remove(btn.dataset.del);
    say(res.ok ? '기록을 지웠습니다.' : res.error, !res.ok);
    render();
  });

  $('exportBtn').addEventListener('click', () => {
    const name = J.download();
    say(`${name} 파일로 내보냈습니다.`);
  });

  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const res = J.importJSON(await file.text());
    if (!res.ok) { say(res.error, true); return; }
    say(res.added ? `${res.added}건을 가져왔습니다.${res.skipped ? ` 이미 있거나 읽을 수 없는 ${res.skipped}건은 건너뛰었습니다.` : ''}`
      : '새로 더할 기록이 없었습니다. 모두 이미 있는 기록입니다.');
    render();
  });

  /* 다른 탭(다른 사이트)에서 저장하면 바로 반영 */
  window.addEventListener('storage', (e) => { if (e.key === J.KEY) render(); });

  render();
})();
