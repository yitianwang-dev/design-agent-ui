import { readdir, readFile } from 'fs/promises';
import { resolve, join } from 'path';

const SCHEMAS_DIR = resolve(process.env.SCHEMAS_DIR || new URL('../../schemas', import.meta.url).pathname);

export async function loadProductSchemas(productId) {
  const dir = join(SCHEMAS_DIR, productId);
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return '';
  }

  const yamlFiles = files.filter(f => f.endsWith('.schema.yaml')).sort();
  const contents = await Promise.all(
    yamlFiles.map(async f => {
      const text = await readFile(join(dir, f), 'utf-8');
      return `### ${f}\n\`\`\`yaml\n${text}\n\`\`\``;
    })
  );

  return contents.join('\n\n');
}

// 選定されたコンポーネント名に関連するスキーマだけを返す
export async function loadSchemasForComponents(productId, componentNames) {
  if (!componentNames.length) return '';

  const dir = join(SCHEMAS_DIR, productId);
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return '';
  }

  const yamlFiles = files.filter(f => f.endsWith('.schema.yaml')).sort();
  const lowerNames = componentNames.map(n => n.toLowerCase());

  const matched = [];
  for (const f of yamlFiles) {
    const text = await readFile(join(dir, f), 'utf-8');
    const textLower = text.toLowerCase();
    if (lowerNames.some(name => textLower.includes(name))) {
      matched.push(`### ${f}\n\`\`\`yaml\n${text}\n\`\`\``);
    }
  }

  return matched.join('\n\n');
}
