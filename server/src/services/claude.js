import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseFigmaUrl, fetchNodeImageAsBase64, fetchNodeStyles } from './figma.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCAFFOLD_DIR = process.env.SCAFFOLD_DIR || '/outputs/figma-design-automation/scaffolds';

async function loadScaffold(type) {
  const file = resolve(SCAFFOLD_DIR, `scaffold_${type.toLowerCase()}.js`);
  return readFile(file, 'utf-8');
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

export async function generateFigmaScript(input) {
  const { screenName, screenType, selectedTab, specUrl, specText, figmaRefUrl, product } = input;

  const rawScaffold = await loadScaffold(screenType);
  // Pre-replace placeholders so Claude doesn't have to
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

  const systemPrompt = `あなたはFigmaデザインを自動生成するDesign Agentです。
Twomiというアプリのスクリーンを、仕様書と参照デザインに基づいてFigma Plugin JavaScriptとして生成します。

## Twomiとは
- 日本のAIアバターコンテンツ作成・配信アプリ（TikTok系ショート動画）
- クリエイターがAIアバターで動画投稿、視聴者がチケット購入で限定コンテンツを閲覧
- カラー: 背景 #000000〜#2E2E2E（ダーク）、アクセント #35C1C6（ティール）
- UIスタイル: iOS風、Noto Sans JP / Inter フォント

## 参照デザインがある場合の鉄則
- 添付画像が「正解のデザイン」。ビジュアルを最大限忠実に再現すること
- 色・フォントサイズ・レイアウト・余白・コンポーネントの配置を参照画像から読み取る
- テキスト内容はプレースホルダー（UserName、creator_nameなど）でOK

## Figma Plugin JSのルール
- scaffold を最初に実行し、返り値の contentFrameNodeId の中身だけを設計する
- layout定数はscaffoldが保証するため自分で設定しない
- appendChild後にfillsを設定する
- グラデーション: type:'GRADIENT_LINEAR', gradientStops, gradientTransform
- ぼかし効果: effects = [{ type:'LAYER_BLUR', radius:25, visible:true }]
- 絵文字: textNode.characters に直接セット可能
- 生成するのはJavaScriptコードのみ

## 出力形式（このテンプレートを必ず使うこと）
\`\`\`javascript
(async function() {
  // 1. scaffoldを実行してcontentFrameNodeIdを取得
  const { contentFrameNodeId } = await (SCAFFOLD_CODE_HERE);

  // 2. contentFrameを取得
  const contentFrame = figma.getNodeById(contentFrameNodeId);

  // 3. contentFrameにコンテンツを追加（ここだけ設計する）
  // ...
})();
\`\`\`

SCAFFOLD_CODE_HEREの部分には、下記の「Scaffoldコード」全体をそのまま置き換えて使うこと。
`;

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
` : ''}
${figmaImageBase64 ? '## 参照デザイン画像\n添付の画像がターゲットデザインです。この外観を再現するコードを生成してください。' : ''}`;

  // Build message content
  const contentBlocks = [];

  // Style references first (visual tone baseline)
  if (styleRefImages.length > 0) {
    contentBlocks.push({ type: 'text', text: `## このプロダクトのビジュアルスタイル基準（${styleRefImages.length}枚）\n以下の画像がこのアプリの既存デザインです。色・グラデーション・フォント・余白・コンポーネントのトーンをこれに合わせてください。` });
    for (const img of styleRefImages) {
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img } });
    }
  }

  // Specific design reference (optional)
  if (figmaImageBase64) {
    contentBlocks.push({ type: 'text', text: '## この画面の設計参照\n以下の画像がこの画面の参照デザインです。レイアウトと構造をこれに近づけてください。' });
    contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: figmaImageBase64 } });
  }

  contentBlocks.push({ type: 'text', text: userTextContent });

  const messageContent = contentBlocks.length > 1 ? contentBlocks : userTextContent;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: messageContent }],
  });

  const content = message.content[0].text;
  const match = content.match(/```javascript\n([\s\S]*?)```/);
  if (!match) throw new Error('JavaScriptコードの生成に失敗しました');

  return match[1].trim();
}
