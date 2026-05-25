import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCAFFOLD_DIR = process.env.SCAFFOLD_DIR || '/outputs/figma-design-automation/scaffolds';

async function loadScaffold(type) {
  const file = resolve(SCAFFOLD_DIR, `scaffold_${type.toLowerCase()}.js`);
  return readFile(file, 'utf-8');
}

async function fetchSpecFromUrl(url) {
  // Google Docs: export as plain text
  const gdocMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (gdocMatch) {
    const docId = gdocMatch[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error(`Google Doc の取得に失敗しました (${res.status})`);
    const text = await res.text();
    return text.slice(0, 12000); // 長すぎる場合は先頭12000文字
  }

  // Generic URL
  const res = await fetch(url, { headers: { 'User-Agent': 'DesignAgent/1.0' } });
  if (!res.ok) throw new Error(`URL の取得に失敗しました (${res.status})`);
  const text = await res.text();
  return text.slice(0, 12000);
}

export async function generateFigmaScript(input) {
  const { screenName, screenType, selectedTab, specUrl, specText, product } = input;

  const scaffoldCode = await loadScaffold(screenType);

  // Fetch spec URL content if provided
  let specContent = specText || '';
  if (specUrl) {
    try {
      const fetched = await fetchSpecFromUrl(specUrl);
      specContent = `【仕様書本文（${specUrl} より取得）】\n${fetched}${specText ? `\n\n【補足】\n${specText}` : ''}`;
    } catch (err) {
      // Fallback: pass URL as-is with error note
      specContent = `仕様書URL: ${specUrl}\n（自動取得失敗: ${err.message}）${specText ? `\n\n補足:\n${specText}` : ''}`;
    }
  }

  const typeDesc = {
    A: 'Header+Scroll型（白背景 / BottomNav Light）',
    B: 'フルスクリーン型（黒背景 / BottomNav Dark）',
    C: 'タブ型（BottomNav なし）',
  };

  const systemPrompt = `あなたはFigmaデザインを自動生成するDesign Agentです。
Twomiというアプリのスクリーンを、仕様書に基づいてFigma Plugin JavaScriptとして生成します。

## Twomiとは
- 日本のAIアバターコンテンツ作成・配信アプリ（TikTok系のショート動画）
- クリエイターがAIアバターで動画を投稿し、視聴者がチケットを購入して限定コンテンツを閲覧できる
- カラー: 背景 #000000〜#1C1C1E（ダーク系）、アクセント #35C1C6 または #3BC9CF（ティール）
- UIスタイル: iOS風、角丸、Liquid Glass、Noto Sans JP / Inter フォント使用
- ボトムナビ: Gallery / Search / Create / Notification / Profile の5タブ

## 重要なUI要素
- "人気！" バッジ: 角丸の薄白背景、小さめフォント
- クリエイターアイコン: 円形、グレー背景のプレースホルダー
- "フォロー" ボタン: ティール系の角丸ボタン
- CTA ボタン: ティール系背景 (#35C1C6)、白テキスト、角丸26px
- ロックアイコン: 🔒 または 🔐 の絵文字テキスト
- エンゲージメント: 💎 アイコン + 数字（例: 1.2k）+ シェア数

## ルール
- scaffold を最初に実行し、返り値の contentFrameNodeId の中身だけを設計する
- layout定数（y=110, y=772など）はscaffoldが保証するため自分で設定しない
- 絵文字はFigmaの textNode で characters に直接セットできる
- appendChild後にfillsを設定する（appendChild前は設定無効）
- 生成するのはJavaScriptコードのみ。説明文・コメントは最小限に

## 出力形式
\`\`\`javascript
(async function() {
  // scaffoldの実行
  // contentFrameへのコンテンツ追加
})();
\`\`\`
`;

  const userMessage = `## リクエスト
- 画面名: ${screenName}
- 画面タイプ: ${screenType}（${typeDesc[screenType]}）
${screenType !== 'C' ? `- 選択タブ: ${selectedTab}` : ''}
- Figmaファイル: ${product.figmaFileKey}

## Scaffoldコード
\`\`\`javascript
${scaffoldCode}
\`\`\`

## 仕様書・UI要件
${specContent}
`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = message.content[0].text;
  const match = content.match(/```javascript\n([\s\S]*?)```/);
  if (!match) throw new Error('JavaScriptコードの生成に失敗しました');

  return match[1].trim();
}
