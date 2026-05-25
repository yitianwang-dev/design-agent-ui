// ============================================================
// scaffold_b.js — Type B: フルスクリーン型（動画背景・黒）
// Twomi Design Agent — Screen Scaffold
// 最終更新: 2026-05-25
//
// 使い方:
//   1. '__SCREEN_NAME__' を画面名に置換 (camelCase)
//   2. '__SELECTED_TAB__' を 'Home'/'Search'/'Create'/'notes'/'Profile' に置換
//   3. Figma Plugin Console / use_figma で実行
//   4. 返り値の contentFrameNodeId の中身だけを Design Agent が埋める
//
// 適用画面例: homeFeed / paidContentCard / avatarZoom
// 特徴: 背景黒 / Header Transparent / NavigationLiquid DarkMode=Dark
//        content は 402×874 全画面 (Header・Nav がオーバーレイで重なる)
// ============================================================

(async function scaffoldB(screenName, selectedTab) {

  // ==================== 丸暗記定数 (変更禁止) ====================
  const W = 402, H = 874;
  const CORNER_R = 32;
  const FOOTER_Y = 772;          // H - FOOTER_H = 874 - 102
  const FOOTER_H = 102;
  const NAV_X = 18;              // (W - 366) / 2
  const NAV_Y = 9;               // FOOTER_H - 37 - 56
  const NAV_W = 366, NAV_H = 56;
  // フルスクリーン型: contentは全画面 (Header/Navがオーバーレイ)
  const CONTENT_Y = 0;
  const CONTENT_H = H;           // 874 (全画面)

  const HEADER_KEY = '7ba6d4a58a3530c3b4102c5b883dce105e0c8f14'; // Transparent, iOS26, After ✅
  const NAV_KEY   = '250f4ab25c2aa2c1eced9b44b7c13056301ce6b7'; // Home, DarkMode=Dark ✅
  // ================================================================

  const page = figma.currentPage;

  // 1. 外枠スクリーン (402×874, r=32, black)
  const screen = figma.createFrame();
  screen.name = screenName;
  screen.resize(W, H);
  screen.cornerRadius = CORNER_R;
  screen.clipsContent = true;
  page.appendChild(screen);

  // 既存フレームと重ならないよう右端に配置
  const siblings = page.children.filter(n => n.id !== screen.id);
  if (siblings.length > 0) {
    const maxRight = Math.max(...siblings.map(n => n.x + n.width));
    screen.x = maxRight + 50;
  } else {
    screen.x = 0;
  }
  screen.y = 0;
  screen.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // #000000

  // 2. Container (全画面スクロール領域)
  const container = figma.createFrame();
  container.name = 'container';
  container.resize(W, H);
  container.fills = [];
  screen.appendChild(container);

  // 3. contentFrame — Design Agent はここだけを埋める (全画面)
  const contentFrame = figma.createFrame();
  contentFrame.name = 'content';
  contentFrame.resize(W, CONTENT_H); // 402 × 874
  contentFrame.x = 0;
  contentFrame.y = CONTENT_Y;        // 0 (フルスクリーン)
  contentFrame.fills = [];
  container.appendChild(contentFrame);

  // 4. Footer (y=772 固定) + NavigationLiquid (DarkMode=Dark)
  const footer = figma.createFrame();
  footer.name = 'footer';
  footer.resize(W, FOOTER_H);
  footer.x = 1;
  footer.y = FOOTER_Y;               // 772 (FIXED)
  footer.fills = [];
  footer.clipsContent = true;
  screen.appendChild(footer);

  const navComp = await figma.importComponentByKeyAsync(NAV_KEY);
  const nav = navComp.createInstance();
  nav.name = 'navigation_liquid';
  nav.resize(NAV_W, NAV_H);
  nav.x = NAV_X;                     // 18 (FIXED)
  nav.y = NAV_Y;                     // 9 (FIXED)
  footer.appendChild(nav);
  // フルスクリーン型は常にDarkMode=Dark
  nav.setProperties({ 'Selected': selectedTab || 'Home', 'DarkMode': 'Dark' });

  // 5. Header (y=0 固定、最前面レイヤー — 必ず最後に appendChild)
  const headerComp = await figma.importComponentByKeyAsync(HEADER_KEY);
  const header = headerComp.createInstance();
  header.name = 'header';
  header.x = 0;
  header.y = 0;                      // 0 (FIXED)
  screen.appendChild(header);        // 最後に追加 = 最前面

  figma.viewport.scrollAndZoomIntoView([screen]);
  figma.notify(`✅ Scaffold B: "${screenName}" | content: ${contentFrame.id} (y=0, h=874, fullscreen)`);

  return {
    screenNodeId: screen.id,
    contentFrameNodeId: contentFrame.id,
  };

})('__SCREEN_NAME__', '__SELECTED_TAB__');
