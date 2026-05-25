// ============================================================
// scaffold_a.js — Type A: Header+Scroll型（白背景）
// Twomi Design Agent — Screen Scaffold
// 最終更新: 2026-05-25
//
// 使い方:
//   1. '__SCREEN_NAME__' を画面名に置換 (camelCase)
//   2. '__SELECTED_TAB__' を 'Home'/'Search'/'Create'/'notes'/'Profile' に置換
//   3. Figma Plugin Console / use_figma で実行
//   4. 返り値の contentFrameNodeId の中身だけを Design Agent が埋める
//
// 適用画面例: packageSelect / settingsTop / userProfile / shopTop
// ============================================================

(async function scaffoldA(screenName, selectedTab) {

  // ==================== 丸暗記定数 (変更禁止) ====================
  const W = 402, H = 874;
  const CORNER_R = 32;
  const HEADER_H = 110;          // iOS26 Header高さ
  const FOOTER_Y = 772;          // H - FOOTER_H = 874 - 102
  const FOOTER_H = 102;
  const NAV_X = 18;              // (W - 366) / 2
  const NAV_Y = 9;               // FOOTER_H - 37 - 56
  const NAV_W = 366, NAV_H = 56;
  const CONTENT_Y = HEADER_H;   // 110 — ヘッダー直下から開始 (絶対禁止: 96等にしない)
  const CONTENT_H = FOOTER_Y - HEADER_H; // 662

  // 確認済み個別バリアントキー (component_set キーは使用禁止)
  const HEADER_KEY = '7ba6d4a58a3530c3b4102c5b883dce105e0c8f14'; // Transparent, iOS26, After ✅
  const NAV_KEY   = '250f4ab25c2aa2c1eced9b44b7c13056301ce6b7'; // Home, DarkMode=Dark ✅ → setPropertiesでLightに切替
  // ================================================================

  const page = figma.currentPage;

  // 1. 外枠スクリーン (402×874, r=32, white)
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
  screen.fills = [{ type: 'SOLID', color: { r: 1, g: 254/255, b: 254/255 } }]; // #FFFEFE

  // 2. Container (スクロール領域全体を包む、fills なし)
  const container = figma.createFrame();
  container.name = 'container';
  container.resize(W, H);
  container.fills = [];
  screen.appendChild(container);

  // 3. contentFrame — Design Agent はここだけを埋める (y=110 固定)
  const contentFrame = figma.createFrame();
  contentFrame.name = 'content';
  contentFrame.resize(W, CONTENT_H); // 402 × 662
  contentFrame.x = 0;
  contentFrame.y = CONTENT_Y;        // 110 (FIXED — ヘッダー高さ)
  contentFrame.fills = [];
  contentFrame.layoutMode = 'VERTICAL';
  contentFrame.primaryAxisSizingMode = 'FIXED';
  contentFrame.counterAxisSizingMode = 'FIXED';
  contentFrame.paddingLeft = 0;
  contentFrame.paddingRight = 0;
  contentFrame.paddingTop = 0;
  contentFrame.paddingBottom = 0;
  container.appendChild(contentFrame);

  // 4. Footer (y=772 固定) + NavigationLiquid (DarkMode=Light)
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
  // DarkMode=Light に切替 (Header+Scroll型は常にLight)
  nav.setProperties({ 'Selected': selectedTab || 'Home', 'DarkMode': 'Light' });

  // 5. Header (y=0 固定、最前面レイヤー — 必ず最後に appendChild)
  const headerComp = await figma.importComponentByKeyAsync(HEADER_KEY);
  const header = headerComp.createInstance();
  header.name = 'header';
  header.x = 0;
  header.y = 0;                      // 0 (FIXED)
  screen.appendChild(header);        // 最後に追加 = 最前面

  figma.viewport.scrollAndZoomIntoView([screen]);
  figma.notify(`✅ Scaffold A: "${screenName}" | content: ${contentFrame.id} (y=110, h=662)`);

  return {
    screenNodeId: screen.id,
    contentFrameNodeId: contentFrame.id,  // Design Agent はここの中身だけ生成する
  };

})('__SCREEN_NAME__', '__SELECTED_TAB__');
