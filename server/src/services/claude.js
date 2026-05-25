import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCAFFOLD_DIR = process.env.SCAFFOLD_DIR || '/outputs/figma-design-automation/scaffolds';

async function loadScaffold(type) {
  const file = resolve(SCAFFOLD_DIR, `scaffold_${type.toLowerCase()}.js`);
  return readFile(file, 'utf-8');
}

export async function generateFigmaScript(input) {
  const { screenName, screenType, selectedTab, specUrl, specText, product } = input;

  const scaffoldCode = await loadScaffold(screenType);

  const specSection = specUrl
    ? `仕様書URL: ${specUrl}\n${specText ? `\n補足:\n${specText}` : ''}`
    : specText;

  const typeDesc = {
    A: 'Header+Scroll型（白背景 / BottomNav Light）',
    B: 'フルスクリーン型（黒背景 / BottomNav Dark）',
    C: 'タブ型（BottomNav なし）',
  };

  const systemPrompt = `あなたはFigma画面設計を自動生成するDesign Agentです。
与えられた仕様書とscaffoldコードをもとに、Figmaで実行可能な完全なJavaScriptコードを1つ生成してください。

## ルール
- scaffold を最初に実行し、返り値の contentFrameNodeId の中身だけを設計する
- layout定数（y=110, y=772など）はscaffoldが保証するため自分で設定しない
- Community libraryコンポーネントは importComponentByKeyAsync でなく clone() で再利用する
- appendChild後にfillsを設定する（appendChild前は無効）
- 生成するのはJavaScriptコードのみ。説明文は不要

## 出力形式
\`\`\`javascript
// 実行可能なFigma Plugin JavaScript
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
${specSection}
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
