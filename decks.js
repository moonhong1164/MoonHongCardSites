/* MoonHong 열 사이트 목록 — 허브의 카드 모음·오늘의 카드·리딩 일지가 함께 쓴다.
 * [저장소 이름(배포 주소), deckId, 덱 색, 덱 이름]. 순서와 색은 허브 메인의 문과 같고,
 * 덱 이름은 각 사이트 cards.json 의 deck 과 같다(카드 비교가 일지에 덱 이름으로 남기므로 맞춰 둘 것).
 * 새 사이트를 만들면 여기에 한 줄 더한다.
 */
window.MoonHongDecks = Object.freeze([
  ['MoonHongOshoZen', 'oshozen', 'var(--leaf)', '오쇼 젠'],
  ['MoonHongBELLINE', 'belline', 'var(--star)', '호로스코프'],
  ['MoonHongSimbolon', 'symbolon', 'var(--violet)', '심볼론'],
  ['MoonHongUniTarot', 'tarot', 'var(--hong)', '타로카드'],
  ['MoonHongLENORMAND', 'lenormand', 'var(--rose)', '레노먼드'],
  ['MoonHongKIPPER', 'kipper', '#8fc3ea', '키퍼'],
  ['MoonHongICHING', 'iching', '#e3b65a', '주역'],
  ['MoonHongColor', 'color', '#f08fb4', '색채 타로'],
  ['MoonHongTRUMP', 'trump', '#e0566a', '트럼프 카드'],
  ['MoonHongRUNE', 'rune', 'var(--ice)', '룬']
].map(([path, deckId, accent, name]) => Object.freeze({ path, deckId, accent, name, json: `https://moonhong1164.github.io/${path}/cards.json` })));
