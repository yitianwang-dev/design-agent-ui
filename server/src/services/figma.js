const FIGMA_API = 'https://api.figma.com/v1';

export function parseFigmaUrl(url) {
  const fileKeyMatch = url.match(/figma\.com\/design\/([a-zA-Z0-9_-]+)/);
  if (!fileKeyMatch) throw new Error('Figma URL から fileKey を抽出できませんでした');
  const fileKey = fileKeyMatch[1];

  const nodeIdMatch = url.match(/node-id=([0-9]+-[0-9]+)/);
  if (!nodeIdMatch) throw new Error('Figma URL に node-id が含まれていません。Figmaで対象フレームを選択した状態のURLを貼ってください');
  const nodeId = nodeIdMatch[1].replace('-', ':');

  return { fileKey, nodeId };
}

export async function fetchNodeImageAsBase64(fileKey, nodeId) {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token) throw new Error('FIGMA_API_TOKEN が設定されていません');

  const imgRes = await fetch(
    `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`,
    { headers: { 'X-Figma-Token': token } }
  );
  if (!imgRes.ok) throw new Error(`Figma API エラー: ${imgRes.status}`);
  const imgData = await imgRes.json();

  const imgUrl = imgData.images?.[nodeId];
  if (!imgUrl) throw new Error('Figma からの画像URLが取得できませんでした');

  const dlRes = await fetch(imgUrl);
  if (!dlRes.ok) throw new Error(`Figmaレンダリング画像のダウンロードに失敗: ${dlRes.status}`);
  const buffer = await dlRes.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

export async function fetchNodeStyles(fileKey, nodeId) {
  const token = process.env.FIGMA_API_TOKEN;
  if (!token) return null;

  const res = await fetch(
    `${FIGMA_API}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=3`,
    { headers: { 'X-Figma-Token': token } }
  );
  if (!res.ok) return null;
  const data = await res.json();

  const node = data.nodes?.[nodeId]?.document;
  if (!node) return null;

  // Extract key style info: colors and text
  const colors = new Set();
  const texts = [];

  function walk(n) {
    if (n.fills) {
      n.fills.forEach(f => {
        if (f.type === 'SOLID' && f.color) {
          const { r, g, b } = f.color;
          const hex = '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
          colors.add(hex);
        }
      });
    }
    if (n.type === 'TEXT' && n.characters) {
      texts.push(n.characters.slice(0, 80));
    }
    (n.children || []).forEach(walk);
  }
  walk(node);

  return {
    name: node.name,
    colors: [...colors].slice(0, 20),
    texts: texts.slice(0, 30),
  };
}
