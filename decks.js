/* MoonHong 열 사이트 목록 — 허브의 카드 모음과 오늘의 카드가 함께 쓴다.
 * [저장소 이름(배포 주소), deckId, 덱 색]. 순서와 색은 허브 메인의 문과 같다.
 * 새 사이트를 만들면 여기에 한 줄 더한다.
 */
window.MoonHongDecks = Object.freeze([
  ['MoonHongOshoZen', 'oshozen', 'var(--leaf)'],
  ['MoonHongBELLINE', 'belline', 'var(--star)'],
  ['MoonHongSimbolon', 'symbolon', 'var(--violet)'],
  ['MoonHongUniTarot', 'tarot', 'var(--hong)'],
  ['MoonHongLENORMAND', 'lenormand', 'var(--rose)'],
  ['MoonHongKIPPER', 'kipper', '#8fc3ea'],
  ['MoonHongICHING', 'iching', '#e3b65a'],
  ['MoonHongColor', 'color', '#f08fb4'],
  ['MoonHongTRUMP', 'trump', '#e0566a'],
  ['MoonHongRUNE', 'rune', 'var(--ice)']
].map(([path, deckId, accent]) => Object.freeze({ path, deckId, accent, json: `https://moonhong1164.github.io/${path}/cards.json` })));
