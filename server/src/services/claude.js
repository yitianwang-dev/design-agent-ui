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

// loadMatchingScreenSchema (2026-05-28): if the request's screenName matches a
// screen-level schema in server/schemas/twomi/screens/, load it and return its
// content. The matching is a normalized substring check: the schema filename
// (e.g. "profile_self.schema.yaml" → normalized "profileself") must appear
// inside the normalized screenName. So screenName="testProfileSelf" matches
// "profile_self.schema.yaml". If no schema matches, returns null and the
// system falls back to component-level schemas only (current behavior).
//
// Screen schemas constrain layout structure + which Library components to use
// + forbidden components list, eliminating most "AI improvises layout" failures.
async function loadMatchingScreenSchema(screenName) {
  const SCREENS_DIR = resolve(__dirname, '../../schemas/twomi/screens');
  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedScreen = normalize(screenName);
  if (!normalizedScreen) return null;
  try {
    const files = (await readdir(SCREENS_DIR)).filter(f => f.endsWith('.schema.yaml'));
    for (const file of files) {
      const base = file.replace('.schema.yaml', '');
      const normalizedBase = normalize(base);
      if (!normalizedBase) continue;
      if (normalizedScreen.includes(normalizedBase)) {
        const content = await readFile(resolve(SCREENS_DIR, file), 'utf-8');
        return { matched: file, content };
      }
    }
  } catch (err) {
    console.warn(`[loadMatchingScreenSchema] failed: ${err.message}`);
  }
  return null;
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

  // Fix (2026-05-28): increase description slice from 80 → 600 chars so the
  // structured "【用途 / Usage】/【State】/【注意 / Notes】/【使用画面 / Used in】"
  // blocks in Twomi Library descriptions are visible to Haiku at selection time.
  // Average description is 200-400 chars; 600 covers full block for all known
  // components. With <300 components currently annotated, prompt size impact
  // is minimal (~150KB worst case).
  const catalogText = componentSets
    .map(cs => `- ${cs.name} (key: ${cs.key})${cs.description ? '\n  ' + cs.description.replace(/\n/g, '\n  ').slice(0, 600) : ''}`)
    .join('\n');

  const prompt = `以下の画面仕様をもとに、contentFrameの実装に必要なFigmaコンポーネントをカタログから選んでください。

## 画面情報
- 画面名: ${screenName}
- 画面タイプ: ${screenType}
- 仕様:
${specContent.slice(0, 3000)}

## コンポーネントカタログ
各コンポーネントの description には以下の構造化情報が含まれます:
  - 【用途 / Usage】: そのコンポーネントの本来の使用文脈
  - 【State】: variant プロパティと値（Enum）
  - 【注意 / Notes】: deprecation 警告・他コンポーネントとの関係・使用制限
  - 【使用画面 / Used in】: そのコンポーネントが本来使われる画面

**コンポーネント選択時は description の Usage と Notes を最優先で読み、
適切な文脈で使うべきコンポーネントだけを選んでください。**
- 「現行画面では使用しないこと」「deprecated」「旧デザイン」と書いてあるものは選ばない
- 「○○へ重ねて表示する」と書いてあるものは単独で選ばない（親コンポーネントと併用）
- Usage に書かれた本来の使用文脈と画面要件が一致しないものは選ばない

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

  // Expanded lint review (2026-05-28): added layer-naming + AutoLayout + spacing
  // checks to catch the violations seen in May 28 generation (content-as-name,
  // direct-placement sparkles, Japanese in layer names, etc.). Review pass acts
  // as a hard linter — if any check fails the code MUST be rewritten.
  const reviewPrompt = `あなたは Figma Plugin JS の品質チェッカーです。以下のコードを **12 項目の lint チェック** で精査し、違反があれば**そのまま修正してコード全文を返す**。

## 画面タイプ: ${screenType}（${typeRules[screenType]}）

## 構造系チェック（Critical）
1. **Header 重複**: contentFrame に Header / headMenu / SearchField 等を import + createInstance していないか。scaffold が自動追加する。
2. **BottomNav 重複**: contentFrame に NavigationLiquid / BottomNav を追加していないか。scaffold が自動追加する。
3. **背景色の矛盾**: Type ${screenType} に合った背景色か（A=白, B=黒系, C=黒系）。
4. **画面外配置**: 任意要素の y 座標 < 0 または y+height > 874 がないか。あれば修正。
5. **contentFrame 外への直接追加**: \`page.appendChild()\` で contentFrame 以外に要素を追加していないか（scaffold の return を無視していないか）。
6. **scaffold 構造の改変**: scaffold が返す \`container\` / \`content\` / \`footer\` / \`header\` の階層を編集していないか。header instance を content の子として追加するのは違反（header は screen の直接子）。

## 命名系チェック（May 28 で発覚）
7. **⚠️ TEXT node の name が内容**: \`.name = "実際の文字列"\` のパターンを検出。
   違反パターン例:
     - \`textNode.name = "Hello world"\` ← spec の文字列が name に
     - \`textNode.name = "1,200"\` / \`"42"\` / \`"12,450"\` ← 数字
     - \`textNode.name = "❤️"\` / \`"🪙"\` / \`"💎"\` / \`"✨"\` ← 絵文字
     - \`textNode.name = "ギフトを贈る"\` / \`"スタンプ"\` / \`"フォロー"\` ← 日本語ラベル
     - \`textNode.name = "@yitian_wang"\` ← ハンドル
     - \`textNode.name = "Yitian Wang"\` / \`"サキ"\` ← ユーザー名
   修正後の正しい name 例:
     - \`bodyText\` / \`titleText\` / \`bioText\` / \`descriptionText\`
     - \`coinCountText\` / \`statValueText\` / \`rankNumText\`
     - \`giftIcon\` / \`coinIcon\` / \`sparkleIcon\` / \`congratulationText\`
     - \`sheetTitleText\` / \`sendCtaText\` / \`primaryActionText\`
     - \`userHandleText\` / \`displayNameText\` / \`senderNameText\`
   違反したら **すべての TEXT node の name を役割名にリネーム**。
8. **通用名の使用**: \`.name = "Rectangle"\` / \`"Frame"\` / \`"Group"\` / \`"Text"\` / \`"label"\` （Figma default name そのまま）。役割名に置き換え。
9. **レイヤー名に日本語**: \`stat_投稿\` / \`stamp_お祝い\` 等、英語以外が混入。必ず camelCase + 英語へ。例: \`stat_posts\` / \`stamp_celebration\`。

## レイアウト系チェック
10. **直置き禁止**: TEXT / SVG / RECTANGLE（icon 用途）が **AutoLayout でない frame の直接子** になっていないか。違反したら AutoLayout コンテナで包む。特に装飾用 ✨ などの粒子は \`sparkleLayer\` / \`particleLayer\` に集約。
11. **Gap が 8 の倍数でない**: \`itemSpacing\` / \`gap\` が 4, 8, 12, 16, 20, 24, 32... 以外（例: 5, 7, 10, 13, 15）。8 の倍数または 4 + 8N に修正。
12. **line-height: Auto**: TEXT に対し lineHeight を設定していない、または \`lineHeight: { unit: 'AUTO' }\`。Noto Sans JP では Auto 禁止。\`lineHeight: { unit: 'PIXELS', value: 数値 }\` に修正。

## 出力フォーマット

問題なし → 元のコードをそのまま返す。
問題あり → 修正したコード全文を返す。**説明・コメント不要**。コードブロックのみ。

\`\`\`javascript
${code}
\`\`\`

修正したコード:

\`\`\`javascript
(修正後 or 元のコード全文)
\`\`\``;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16384,  // increased from 8192 because review may rewrite large screens
    messages: [{ role: 'user', content: reviewPrompt }],
  });

  const text = message.content[0].text;
  // Find the LAST javascript code block (the fixed version, not the input)
  const matches = [...text.matchAll(/```javascript\n([\s\S]*?)```/g)];
  if (matches.length === 0) {
    console.warn('[reviewAndFixScript] no code block in response, using original');
    return code;
  }
  const reviewed = matches[matches.length - 1][1].trim();
  // Sanity: reviewed must be a non-trivial amount of code (>30% of original)
  if (reviewed.length < code.length * 0.3) {
    console.warn(`[reviewAndFixScript] reviewed code too short (${reviewed.length} < 30% of ${code.length}), using original`);
    return code;
  }
  console.log(`[reviewAndFixScript] original ${code.length} → reviewed ${reviewed.length} chars`);
  return reviewed;
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
    ? `\n\n## ⚠️ Twomi Design Agent Rules — 必ず厳守（違反は再生成対象）\n\n以下のルール群は最優先。仕様書や参照デザインと矛盾する場合は本ルールに従うこと。\n\n${rulesContent}\n\n## 上記ルール群の要約（最重要、再確認）\n- Library Component を必ず使う。createEllipse / createRectangle で頭像・アバターを代替する禁止\n- 既存 component を編集しない（参照のみ）\n- 画面 W402×H874、Gap 8の倍数、line-height は数値指定必須\n- screen copy しない。差分は variant / visibility / Prototype で吸収\n- Avatar infomation を人間 profile に使わない\n- **⚠️ TEXT node の name は絶対に内容（characters）にしない。必ず役割名（〜Text / 〜Label / 〜Icon）で命名する。spec に出てくる文字列を node 名に使ったら MUST 違反。詳細は rules §1.7 参照。**\n- **⚠️ アイコン・テキストの直置き禁止。すべて AutoLayout コンテナの中に入れる（装飾用 ✨ パーティクルも例外なし）。**\n`
    : '';

  // Screen-level schema (2026-05-28): if request's screenName matches a known
  // screen schema in server/schemas/twomi/screens/, inject it. This gives the
  // agent exact layout structure + component constraints + forbidden list for
  // that specific screen, eliminating most "AI improvises layout" failures.
  const screenSchema = await loadMatchingScreenSchema(screenName);
  if (screenSchema) {
    console.log(`[screenSchema] matched ${screenSchema.matched} for screenName="${screenName}"`);
  } else {
    console.log(`[screenSchema] no match for screenName="${screenName}" — falling back to component schemas only`);
  }
  const screenSchemaSection = screenSchema
    ? `\n\n## 🎯 画面固有スキーマ（${screenSchema.matched}）\n\nこのリクエストの screenName="${screenName}" は以下の画面スキーマにマッチしました。\n**この構造を厳格に守ってください。spec と矛盾する場合は本スキーマの構造を優先**（spec は内容を供給する役割、本スキーマは骨格を定義する役割）。\nスキーマに記載された forbidden_components は絶対に使わないこと。required_components は必ず使うこと。\n\n${screenSchema.content}\n`
    : '';

  const systemPrompt = `あなたはFigmaデザインを自動生成するDesign Agentです。
Twomiというアプリのスクリーンを、仕様書と参照デザインに基づいてFigma Plugin JavaScriptとして生成します。${rulesSection}${screenSchemaSection}

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
