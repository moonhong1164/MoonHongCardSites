/* MoonHong 리딩 일지 — 열 사이트가 함께 쓰는 기록장
 *
 * 모든 MoonHong 사이트는 moonhong1164.github.io 한 출처 아래에 있어서 localStorage를 함께 쓴다.
 * 다른 사이트에서는 아래처럼 불러 쓴다.
 *   <script src="https://moonhong1164.github.io/MoonHongCardSites/journal.js"></script>
 *   MoonHongJournal.save({ deck: '타로카드', deckId: 'tarot', spread: '쓰리 카드', question, memo,
 *                          cards: [{ name: '바보', position: '과거', orientation: 'upright' }] });
 *
 * 리딩 1건: { id, createdAt, deck, deckId, spread, question, cards[{name, position, orientation}], memo, site }
 *   orientation: 'upright'(정방향) | 'reversed'(역방향) | null(방향이 없는 덱)
 * 저장소를 못 쓰는 환경(사생활 보호 창 등)에서는 예외 대신 { ok: false, error } 를 돌려준다.
 */
(function (root) {
  'use strict';
  if (root.MoonHongJournal) return;

  const KEY = 'moonhong-journal';
  const ORIENT = ['upright', 'reversed'];
  const ORIENT_KO = { upright: '정방향', reversed: '역방향' };

  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  function newId() {
    const r = new Uint32Array(1);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(r);
    else r[0] = Math.floor(Math.random() * 2 ** 32);
    return `r-${Date.now().toString(36)}-${r[0].toString(36)}`;
  }

  /* 들어온 값을 정해진 모양으로 다듬는다. 덱 이름이나 카드가 없으면 기록으로 치지 않는다 */
  function clean(e, keepId) {
    if (!e || typeof e !== 'object') return null;
    const cards = (Array.isArray(e.cards) ? e.cards : []).map((c) => {
      if (!c || typeof c !== 'object') return null;
      const name = str(c.name, 80);
      if (!name) return null;
      return { name, position: str(c.position, 80), orientation: ORIENT.includes(c.orientation) ? c.orientation : null };
    }).filter(Boolean).slice(0, 200);
    const deck = str(e.deck, 40);
    if (!deck || !cards.length) return null;
    const t = new Date(e.createdAt);
    return {
      id: keepId && str(e.id, 64) ? str(e.id, 64) : newId(),
      createdAt: keepId && !isNaN(t) ? t.toISOString() : new Date().toISOString(),
      deck,
      deckId: str(e.deckId, 40) || deck,
      spread: str(e.spread, 80),
      question: str(e.question, 300),
      cards,
      memo: str(e.memo, 4000),
      site: /^https?:\/\//.test(e.site || '') ? str(e.site, 300) : ''
    };
  }

  function read() {
    try {
      const raw = root.localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.map((e) => clean(e, true)).filter(Boolean) : [];
    } catch (err) {
      return [];
    }
  }
  function write(list) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(list));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: '이 브라우저에서는 기록을 저장할 수 없습니다. (사생활 보호 창이거나 저장 공간이 가득 찼을 수 있습니다)' };
    }
  }
  const newestFirst = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

  /* 저장. 성공하면 { ok: true, entry } */
  function save(entry) {
    const e = clean(Object.assign({ site: root.location ? root.location.href.split('#')[0] : '' }, entry), false);
    if (!e) return { ok: false, error: '덱 이름과 카드가 한 장 이상 있어야 저장할 수 있습니다.' };
    const list = read();
    list.push(e);
    const res = write(list);
    return res.ok ? { ok: true, entry: e } : res;
  }

  /* 전체를 최신순으로. 같은 시각이면 나중에 저장한 쪽이 위 (sort는 안정 정렬) */
  function all() {
    return read().reverse().sort(newestFirst);
  }

  function remove(id) {
    const list = read();
    const rest = list.filter((e) => e.id !== id);
    if (rest.length === list.length) return { ok: false, error: '그 기록을 찾지 못했습니다.' };
    return write(rest);
  }

  function exportJSON() {
    return JSON.stringify({ app: 'moonhong-journal', version: 1, exportedAt: new Date().toISOString(), entries: all() }, null, 2);
  }

  /* 백업 파일 내려받기 (브라우저 전용) */
  function download() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `moonhong-journal-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    const url = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
  }

  /* 가져오기: 지금 기록에 합친다. 같은 id는 건너뛴다. 내보낸 파일 형태와 맨 배열 둘 다 받는다 */
  function importJSON(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return { ok: false, error: 'JSON 파일을 읽지 못했습니다.' };
    }
    const incoming = Array.isArray(data) ? data : data && Array.isArray(data.entries) ? data.entries : null;
    if (!incoming) return { ok: false, error: 'MoonHong 리딩 일지 백업 파일이 아닙니다.' };
    const list = read();
    const seen = new Set(list.map((e) => e.id));
    let added = 0;
    let skipped = 0;
    incoming.forEach((raw) => {
      const e = clean(raw, true);
      if (!e || seen.has(e.id)) { skipped += 1; return; }
      seen.add(e.id);
      list.push(e);
      added += 1;
    });
    if (!added) return { ok: true, added, skipped };
    const res = write(list);
    return res.ok ? { ok: true, added, skipped } : res;
  }

  root.MoonHongJournal = Object.freeze({ KEY, ORIENT_KO, save, all, remove, exportJSON, download, importJSON });
})(window);
