// ============================================================
// scaffold_c.js — Type C: フルスクリーン+タブ型（BottomNav なし）
// Twomi Design Agent — Screen Scaffold
// 最終更新: 2026-05-25
//
// 使い方:
//   1. '__SCREEN_NAME__' を画面名に置換 (camelCase)
//   2. Figma Plugin Console / use_figma で実行
//   3. 返り値の contentFrameNodeId の中身だけを Design Agent が埋める
//
// 適用画面例: avatarProfileSelf / creatorStudio / liveStreamFull
// 特徴: NavigationLiquid なし / Header のみ / content 全画面
// ============================================================

(async function scaffoldC(screenName) {

  // ==================== 丸暗記定数 (変更禁止) ====================
  const W = 402, H = 874;
  const CORNER_R = 32;
  const CONTENT_Y = 0;
  const CONTENT_H = H;           // 874 (全画面、Headerがオーバーレイ)

  const HEADER_KEY = '7ba6d4a58a3530c3b4102c5b883dce105e0c8f14'; // Transparent, iOS26, After ✅
  // NavigationLiquid なし
  // ================================================================

  const page = figma.currentPage;

  // 1. 外枠スクリーン (402×874, r=32, black)
  const screen = figma.createFrame();
  screen.name = screenName;
  screen.resize(W, H);
  screen.cornerRadius = CORNER_R;
  screen.clipsContent = true;
  page.appendChild(screen);
  screen.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // #000000

  // 2. Container
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
  contentFrame.y = CONTENT_Y;        // 0
  contentFrame.fills = [];
  container.appendChild(contentFrame);

  // 4. Header (y=0 固定、最前面レイヤー — BottomNav なし)
  const headerComp = await figma.importComponentByKeyAsync(HEADER_KEY);
  const header = headerComp.createInstance();
  header.name = 'header';
  header.x = 0;
  header.y = 0;                      // 0 (FIXED)
  screen.appendChild(header);        // 最後に追加 = 最前面

  figma.viewport.scrollAndZoomIntoView([screen]);
  figma.notify(`✅ Scaffold C: "${screenName}" | content: ${contentFrame.id} (no BottomNav)`);

  return {
    screenNodeId: screen.id,
    contentFrameNodeId: contentFrame.id,
  };

})('__SCREEN_NAME__');
