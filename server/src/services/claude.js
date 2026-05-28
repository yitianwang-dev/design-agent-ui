import Anthropic from '@anthropic-ai/sdk';
import { readFile, readdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFigmaUrl, fetchNodeImageAsBase64, fetchNodeStyles, fetchComponentSets } from './figma.js';
import { loadSchemasForComponents } from './schemas.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fix (2026-05-27): make SCAFFOLD_DIR relative to this file (__dirname-based)
// so the path resolves correctly on Railway (where /outputs/figma-design-automation/
// doesn't exist) and on any machine cloning the repo.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCAFFOLD_DIR = process.env.SCAFFOLD_DIR || resolve(__dirname, '../../scaffolds');
const RULES_DIR = process.env.RULES_DIR || resolve(__dirname, '../../rules');

async function loadScaffold(type) {
  const file = resolve(SCAFFOLD_DIR, `scaffold_${type.toLowerCase()}.js`);
  return readFile(file, 'utf-8');
}

// loadAllRules (2026-05-28): read every .md file in server/rules/ and concatenate
// them so the system prompt can include the full Design Agent rule set + Twomi
// design system references (master / structure / component / screen_analysis).
// Files are sorted alphabetically so the rules file (which starts "twomi_design_agent_")
// comes before the references. If the folder is missing or empty, returns ''.
async function loadAllRules() {
  try {
    const files = (await readdir(RULES_DIR))
      .filter(f => f.endsWith('.md'))
      .sort();
    if (files.length === 0) return '';
    const sections = await Promise.all(
      files.map(async f => {
        const content = await readFile(resolve(RULES_DIR, f), 'utf-8');
        return `### Source: ${f}\n\n${content}`;
      })
    );
    return sections.join('\n\n---\n\n');
  } catch (err) {
    console.warn(`[loadAllRules] failed to load rules from ${RULES_DIR}: ${err.message}`);
    return '';
  }
}

async function fetchSpecFromUrl(url) {
  const gdocMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (gdocMatch) {
    const docId = gdocMatch[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error(`Google Doc の取得に失敗しました (${res.status})`);
    const text = await res.text();
    return text.slice(0, 12000);
  }

  const res = await fetch(url, { headers: { 'User-Agent': 'DesignAgent/1.0' } });
  if (!res.ok) throw new Error(`URL の取得に失敗しました (${res.status})`);
  const text = await res.text();
  return text.slice(0, 12000);
}

async function selectComponents(specContent, screenType, screenName, componentSets) {
  if (!componentSets.length) return [];

  const catalogText = componentSets
    .map(cs => `- ${cs.name} (key: ${cs.key})${cs.description ? ': ' + cs.description.slice(0, 80) : ''}`)
    .join('\n');

  const prompt = `以下の画面仕様をもとに、contentFrameの実装に必要なFigmaコンポーネントをカタログから選んでください。

## 画面情報
- 画面名: ${screenName}
- 画面タイプ: ${screenType}
- 仕様:
${specContent.slice(0, 3000)}

## コンポーネントカタログ
${catalogText}

## 注意
- scaffoldが自動追加するHeader・BottomNav・NavigationLiquidは除外する
- contentFrame内のコンテンツに必要なものだけ選ぶ
- 確実に使うものだけ選ぶ（不確かなものは除外）

以下のJSON配列形式のみで返してください（説明不要）:
[{"name": "コンポーネント名", "key": "key文字列"}, ...]`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const selected = JSON.parse(jsonMatch[0]);
    console.log('[selectComponents]', selected.map(c => c.name).join(', '));
    return selected;
  } catch {
    console.error('[selectComponents] parse failed:', text.slice(0, 200));
    return [];
  }
}

async function reviewAndFixScript(code, screenType) {
  const typeRules = {
    A: '白背景(#FFFFFF)・Header+Scroll・BottomNav Light',
    B: '黒背景(#000000〜#2E2E2E)・フルスクリーン・BottomNav Dark',
    C: 'BottomNavなし・タブ切り替え',
  };

  const reviewPrompt = `以下のFigma Plugin JavaScriptコードを品質チェックしてください。

## 画面タイプ: ${screenType}（${typeRules[screenType]}）

## チェック項目
1. **Header重複**: contentFrameにHeaderコンポーネント（importComponentByKeyAsync/createInstance）を追加していないか
2. **BottomNav重複**: contentFrameにNavigationLiquidやBottomNavを追加していないか
3. **背景色の矛盾**: Type ${screenType}に合った背景色か（A=白, B=黒系）
4. **画面外配置**: y座標が874を超えている要素がないか
5. **contentFrame外への直接追加**: page.appendChild()でcontentFrame以外に要素を追加していないか

## コード
\`\`\`javascript
${code}
\`\`\`

問題があれば修正したコードをそのまま返してください。
問題がなければ元のコードをそのまま返してください。
説明は不要です。コードブロックのみ返してください。

\`\`\`javascript
(修正後 or 元のコード)
\`\`\``;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    messages: [{ role: 'user', content: reviewPrompt }],
  });

  const text = message.content[0].text;
  const match = text.match(/```javascript\n([\s\S]*?)```/);
  if (!match) return code; // レビュー失敗時は元コードをそのまま使う
  return match[1].trim();
}

export async function generateFigmaScript(input) {
  const { screenName, screenType, selectedTab, specUrl, specText, figmaRefUrl, product } = input;

  const rawScaffold = await loadScaffold(screenType);
  const scaffoldCode = rawScaffold
    .replace(/'__SCREEN_NAME__'/g, JSON.stringify(screenName))
    .replace(/'__SELECTED_TAB__'/g, JSON.stringify(selectedTab || 'Home'));

  // Fetch spec URL content
  let specContent = specText || '';
  if (specUrl) {
    try {
      const fetched = await fetchSpecFromUrl(specUrl);
      specContent = `【仕様書本文（${specUrl} より取得）】\n${fetched}${specText ? `\n\n【補足】\n${specText}` : ''}`;
    } catch (err) {
      specContent = `仕様書URL: ${specUrl}\n（自動取得失敗: ${err.message}）${specText ? `\n\n補足:\n${specText}` : ''}`;
    }
  }

  // Step 1: Fetch component catalog from library
  let componentSets = [];
  if (product.libraryFileKey) {
    try {
      componentSets = await fetchComponentSets(product.libraryFileKey);
      console.log(`[catalog] ${componentSets.length} component sets loaded`);
    } catch (err) {
      console.error('Component sets fetch failed:', err.message);
    }
  }

  // Step 2: Select relevant components for this screen (Haiku)
  const selectedComponents = await selectComponents(specContent, screenType, screenName, componentSets);

  // Step 3: Load schema guidelines for selected components only
  const schemaContent = await loadSchemasForComponents(
    product.id || 'twomi',
    selectedComponents.map(c => c.name)
  );
  console.log(`[schemas] ${schemaContent ? schemaContent.split('###').length - 1 : 0} schema(s) matched`);

  // Fetch style reference images (product-level, always included)
  const styleRefImages = [];
  for (const refUrl of (product.styleRefUrls || []).slice(0, 2)) {
    try {
      const { fileKey, nodeId } = parseFigmaUrl(refUrl);
      const img = await fetchNodeImageAsBase64(fileKey, nodeId);
      styleRefImages.push(img);
    } catch (err) {
      console.error('Style ref fetch failed:', err.message);
    }
  }

  // Fetch specific design reference (per-request, optional)
  let figmaImageBase64 = null;
  let figmaStyleInfo = null;
  if (figmaRefUrl) {
    try {
      const { fileKey, nodeId } = parseFigmaUrl(figmaRefUrl);
      [figmaImageBase64, figmaStyleInfo] = await Promise.all([
        fetchNodeImageAsBase64(fileKey, nodeId),
        fetchNodeStyles(fileKey, nodeId),
      ]);
    } catch (err) {
      console.error('Figma reference fetch failed:', err.message);
    }
  }

  const typeDesc = {
    A: 'Header+Scroll型（白背景 / BottomNav Light）',
    B: 'フルスクリーン型（黒背景 / BottomNav Dark）',
    C: 'タブ型（BottomNav なし）',
  };

  // Load all rules / design-system references from server/rules/*.md.
  // These are injected into the system prompt so the agent has full context on
  // Twomi UI rules (MUST/SHOULD/NICE), Library component white/blacklists,
  // layout / color / naming / philosophy. See server/rules/README or the
  // twomi_design_agent_rules.md for the rule taxonomy.
  const rulesContent = await loadAllRules();
  console.log(`[rules] loaded ${rulesContent.length} chars from rules/`);
  const rulesSection = rulesContent
    ? `\n\n## ⚠️ Twomi Design Agent Rules — 必ず厳守（違反は再生成対象）\n\n以下のルール群は最優先。仕様書や参照デザインと矛盾する場合は本ルールに従うこと。\n\n${rulesContent}\n\n## 上記ルール群の要約（再確認）\n- Library Component を必ず使う。createEllipse / createRectangle で頭像・アバターを代替する禁止\n- 既存 component を編集しない（参照のみ）\n- 画面 W402×H874、Gap 8の倍数、line-height は数値指定必須\n- screen copy しない。差分は variant / visibility / Prototype で吸収\n- Avatar infomation を人間 profile に使わない\n`
    : '';

  const systemPrompt = `あなたはFigmaデザインを自動生成するDesign Agentです。
Twomiというアプリのスクリーンを、仕様書と参照デザインに基づいてFigma Plugin JavaScriptとして生成します。${rulesSection}

## Twomiとは
- 日本のAIアバターコンテンツ作成・配信アプリ（TikTok系ショート動画）
- クリエイターがAIアバターで動画投稿、視聴者がチケット購入で限定コンテンツを閲覧
- カラー: 背景 #000000〜#2E2E2E（ダーク）、アクセント #35C1C6（ティール）
- UIスタイル: iOS風、Noto Sans JP / Inter フォント

## scaffoldの境界（絶対厳守）
- scaffoldは Header と BottomNav を自動で追加する
- **contentFrameにHeader・BottomNav・NavigationLiquidを追加することは禁止**
- contentFrameは「コンテンツ本体だけ」を担当する
- Type A: contentFrameはy=110〜772の白背景スクロール領域
- Type B: contentFrameは全画面(0〜874)の背景と動画オーバーレイを担当

## スタイル参照画像の使い方
- 色・グラデーション・フォントスタイル・コンポーネントの質感だけを参考にする
- **レイアウト・構造・画面タイプは仕様書に従う（参照画像のレイアウトをコピーしない）**

## 設計参照画像の使い方
- 設計参照がある場合はレイアウト・構造を参考にする

## Figma Plugin JSのルール
- scaffold を最初に実行し、返り値の contentFrameNodeId の中身だけを設計する
- **コンポーネントカタログが提供されている場合は、必ずカタログのkeyを使って \`importComponentSetByKeyAsync\` でインポートし \`.createInstance()\` でインスタンス化すること**
- **スキーマ（使用ガイドライン）が存在するコンポーネントについては、スキーマのバリアント選択・プロパティ設定・注意点に必ず従うこと**
- カタログにもスキーマにも存在しないUI要素のみ自前でノードを作成する
- \`importComponentSetByKeyAsync\` の返り値の \`.defaultVariant\` または \`.variants\` から条件に合うバリアントを選ぶ
- appendChild後にfillsを設定する
- グラデーション: type:'GRADIENT_LINEAR', gradientStops, gradientTransform
- ぼかし効果: effects = [{ type:'LAYER_BLUR', radius:25, visible:true }]
- 絵文字: textNode.characters に直接セット可能
- 生成するのはJavaScriptコードのみ

## 出力形式（このテンプレートを必ず使うこと）
\`\`\`javascript
(async function() {
  const { contentFrameNodeId } = await (SCAFFOLD_CODE_HERE);
  const contentFrame = figma.getNodeById(contentFrameNodeId);
  // contentFrameにのみコンテンツを追加
})();
\`\`\`
SCAFFOLD_CODE_HEREの部分には下記のScaffoldコード全体を置き換えて使うこと。
`;

  // Selected components → pre-written import snippet
  const catalogSection = selectedComponents.length > 0
    ? `\n## 【必須】ライブラリコンポーネントのインポート（冒頭に必ずこのコードを入れること）\n以下のインポート変数を使ってコンポーネントをインスタンス化すること。createEllipse / createRectangle 等で代替することは禁止。\n\n\`\`\`javascript\n// Library component imports — DO NOT REMOVE\n${selectedComponents.map(c => `const _set_${c.name.replace(/[^a-zA-Z0-9]/g, '_')} = await figma.importComponentSetByKeyAsync("${c.key}"); // ${c.name}`).join('\n')}\n\`\`\``
    : '';

  // Matched schemas → focused guidelines section
  const schemaSection = schemaContent
    ? `\n## コンポーネント使用ガイドライン（スキーマ）\n以下のスキーマに従ってバリアント選択・プロパティ設定・注意点を守ること。\n\n${schemaContent}`
    : '';

  const componentSection = catalogSection + schemaSection;

  const userTextContent = `## リクエスト
- 画面名: ${screenName}
- 画面タイプ: ${screenType}（${typeDesc[screenType]}）
${screenType !== 'C' ? `- 選択タブ: ${selectedTab}` : ''}
- Figmaファイル: ${product.figmaFileKey || '未指定'}

## Scaffoldコード
\`\`\`javascript
${scaffoldCode}
\`\`\`

## 仕様書・UI要件
${specContent}
${figmaStyleInfo ? `
## 参照デザインのスタイル情報
- ノード名: ${figmaStyleInfo.name}
- 使用カラー: ${figmaStyleInfo.colors.join(', ')}
- テキスト要素: ${figmaStyleInfo.texts.join(' / ')}
` : ''}${componentSection}`;

  // Build message content
  const contentBlocks = [];

  if (styleRefImages.length > 0) {
    contentBlocks.push({ type: 'text', text: `## スタイル参照（色・質感のみ / レイアウトはコピーしない）\n以下の画像からTwomiの色・グラデーション・フォントの質感を読み取ってください。\n⚠️ レイアウト・構造・画面タイプは無視すること。仕様書に従って設計すること。` });
    for (const img of styleRefImages) {
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img } });
    }
  }

  if (figmaImageBase64) {
    contentBlocks.push({ type: 'text', text: '## 設計参照（レイアウト・構造を参考にする）' });
    contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: figmaImageBase64 } });
  }

  contentBlocks.push({ type: 'text', text: userTextContent });

  const messageContent = contentBlocks.length > 1 ? contentBlocks : userTextContent;

  // Expose selected components for debug logging
  generateFigmaScript._lastSelectedComponents = selectedComponents;

  // Step 4: Generate JS (Opus)
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: messageContent }],
  });

  const generated = message.content[0].text;
  const match = generated.match(/```javascript\n([\s\S]*?)```/);
  if (!match) {
    console.error('[claude] no code block found. response length:', generated.length);
    console.error('[claude] response preview:', generated.slice(0, 500));
    throw new Error('JavaScriptコードの生成に失敗しました');
  }

  const rawCode = match[1].trim();

  // Step 5: Review & fix (Haiku)
  const reviewedCode = await reviewAndFixScript(rawCode, screenType);

  return reviewedCode;
}
