const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  cards: '<rect x="7" y="3" width="13" height="17" rx="3"/><path d="M4 6 2 19a2 2 0 0 0 2 2l9 1M11 8h5m-5 4h3"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-7A8 8 0 1 1 21 11Z"/><path d="M8 10h8m-8 4h4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  trophy: '<path d="M8 3h8v5a4 4 0 0 1-8 0Zm4 9v6m-4 3h8m-10-3h12M8 5H4v3a4 4 0 0 0 5 4m7-7h4v3a4 4 0 0 1-5 4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  bookmark: '<path d="M6 3h12v19l-6-4-6 4Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flame: '<path d="M12 2c1 6 6 6 6 12a6 6 0 0 1-12 0c0-4 3-5 4-8 0 4 2 4 2 4Z"/>',
  spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  cup: '<path d="M4 8h12v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3"/>',
  hand: '<path d="M8 12V6a2 2 0 0 1 4 0v6-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9a7 7 0 0 1-12 5l-5-6a2 2 0 0 1 3-3l2 2"/>',
  audio: '<path d="m3 9 5 0 5-5v16l-5-5H3Zm14-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  hash: '<path d="m9 3-2 18M17 3l-2 18M3 8h18M2 16h18"/>',
  heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-6 6 8 15 8 15S26 11 20 5Z"/>',
  bag: '<path d="M4 7h16l1 15H3Zm4 0V5a4 4 0 0 1 8 0v2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 5h1m4 0h1"/>',
  sprout: '<path d="M12 22V12C3 14 2 7 3 3c7 0 11 2 9 9 0-7 4-9 9-8 0 7-2 9-9 8"/>',
  crown: '<path d="m3 5 5 4 4-7 4 7 5-4-2 14H5Zm2 17h14"/>',
  external: '<path d="M13 3h8v8m0-8L11 13m-1-9H4v16h16v-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  shield: '<path d="m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  refresh: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
};
export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}

export function heroArt() {
  return `<svg class="hero-art" viewBox="0 0 420 300" fill="none" aria-hidden="true">
    <circle cx="227" cy="155" r="112" fill="#d6cdfa"/><path d="M105 226c-6-42 7-76 45-112m160-68c46 10 65 52 54 85" stroke="#b4a4ef" stroke-width="1.5" stroke-dasharray="5 7"/>
    <path d="m327 24 4 14 14 4-14 4-4 14-4-14-14-4 14-4Z" fill="#c9ee78"/>
    <rect x="111" y="71" width="192" height="145" rx="26" transform="rotate(-10 111 71)" fill="#fcfbf7"/>
    <path d="m141 113 72-12m-67 34 112-19m-108 41 89-15" stroke="#c4bbeb" stroke-width="9" stroke-linecap="round"/>
    <rect x="188" y="126" width="181" height="98" rx="28" transform="rotate(8 188 126)" fill="#cfea86"/>
    <path d="m202 214-2 32 37-27" fill="#cfea86"/>
    <text x="208" y="181" fill="#2f3540" font-family="Arial, sans-serif" font-size="30" font-weight="700" transform="rotate(8 208 181)">Сәлем!</text>
    <circle cx="119" cy="213" r="31" fill="#7970d6"/><path d="m106 212 9 10 17-20" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="332" cy="243" r="7" fill="#a99be7"/><circle cx="93" cy="70" r="5" fill="#c9ee78"/>
    <path d="m85 152 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="#fff"/>
    <text x="266" y="87" fill="#9c8bd9" font-family="Georgia, serif" font-size="34" font-style="italic">ә</text>
  </svg>`;
}

export function articleArt(type, color = '') {
  const content = {
    steps: '<path d="M20 131h41V97h42V62h42V28h40v126H20Z" fill="#a89be6"/><path d="M20 155h190" stroke="#6555b2" stroke-width="2"/><circle cx="163" cy="24" r="19" fill="#d8ed94"/><path d="m158 25 5 5 8-10" stroke="#444d32" stroke-width="2.5"/>',
    hello: '<rect x="31" y="38" width="128" height="77" rx="22" fill="#e19a77"/><path d="m46 109-2 22 29-16" fill="#e19a77"/><text x="49" y="84" font-family="Arial" font-size="28" fill="#fff">Сәлем!</text><circle cx="177" cy="132" r="24" fill="#faf3dc"/><path d="m165 132 9 8 16-18" stroke="#b77d58" stroke-width="3"/>',
    tea: '<path d="M54 62h111v65a38 38 0 0 1-38 38H92a38 38 0 0 1-38-38Z" fill="#8ab8a2"/><path d="M165 75h13a25 25 0 0 1 0 50h-13" stroke="#8ab8a2" stroke-width="13"/><path d="M84 43c-15-13 16-15 1-30m44 30c-15-13 16-15 1-30" stroke="#e4eee3" stroke-width="5" stroke-linecap="round"/>',
    letters: '<text x="28" y="111" font-family="Georgia" font-size="106" fill="#b78c3c">Ә</text><text x="123" y="144" font-family="Georgia" font-size="74" fill="#dfb761">ө</text><circle cx="169" cy="40" r="22" fill="#f7e5b4"/><path d="m165 30 2 10 10 2-10 2-2 10-2-10-10-2 10-2Z" fill="#a4803f"/>',
    city: '<path d="M34 161V77h42v84m10 0V43h62v118m12 0V94h40v67" fill="#8ba4c8"/><path d="M100 64h12m9 0h12m-33 23h12m9 0h12m-33 23h12m9 0h12M49 97h13m-13 22h13m112-6h12" stroke="#e9f0f9" stroke-width="6"/><path d="M17 162h202" stroke="#607faa" stroke-width="3"/>',
    books: '<rect x="38" y="54" width="43" height="105" rx="4" fill="#9f90d6"/><rect x="85" y="31" width="48" height="128" rx="4" fill="#c1b3ed"/><rect x="142" y="64" width="39" height="99" rx="4" transform="rotate(-12 142 64)" fill="#b6cc88"/><path d="M48 74h22M95 53h27m-74 88h22m25 0h27" stroke="#f7f5ed" stroke-width="4"/>',
  };
  return `<svg class="article-art ${color}" viewBox="0 0 240 185" fill="none" aria-hidden="true">${content[type] || content.books}</svg>`;
}
