import { readdir, readFile, stat } from 'fs/promises';
import { resolve, join, relative } from 'path';

const SCHEMAS_DIR = resolve(process.env.SCHEMAS_DIR || new URL('../../schemas', import.meta.url).pathname);

// Recursively collect all *.schema.yaml under a directory.
// Returns array of { abspath, relpath } (relpath is relative to the productDir
// so it preserves subfolder context, e.g. 'liveshow/01_xxx.schema.yaml').
// 2026-06-03 (PR #27): added subdir scan so server/schemas/twomi/liveshow/
// and any future grouping subfolders are picked up automatically.
async function collectSchemaFiles(rootDir) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      let stats;
      try {
        stats = await stat(full);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        // Skip the screens/ subfolder — those are loaded separately by claude.js
        // via the screen-level schema match logic (per-request, not per-component).
        if (entry === 'screens') continue;
        await walk(full);
      } else if (entry.endsWith('.schema.yaml')) {
        out.push({ abspath: full, relpath: relative(rootDir, full) });
      }
    }
  }
  await walk(rootDir);
  return out.sort((a, b) => a.relpath.localeCompare(b.relpath));
}

export async function loadProductSchemas(productId) {
  const dir = join(SCHEMAS_DIR, productId);
  const files = await collectSchemaFiles(dir);
  if (files.length === 0) return '';

  const contents = await Promise.all(
    files.map(async ({ abspath, relpath }) => {
      const text = await readFile(abspath, 'utf-8');
      return `### ${relpath}\n\`\`\`yaml\n${text}\n\`\`\``;
    })
  );

  return contents.join('\n\n');
}

// 選定されたコンポーネント名に関連するスキーマだけを返す
export async function loadSchemasForComponents(productId, componentNames) {
  if (!componentNames.length) return '';

  const dir = join(SCHEMAS_DIR, productId);
  const files = await collectSchemaFiles(dir);
  if (files.length === 0) return '';

  const lowerNames = componentNames.map(n => n.toLowerCase());

  const matched = [];
  for (const { abspath, relpath } of files) {
    const text = await readFile(abspath, 'utf-8');
    const textLower = text.toLowerCase();
    if (lowerNames.some(name => textLower.includes(name))) {
      matched.push(`### ${relpath}\n\`\`\`yaml\n${text}\n\`\`\``);
    }
  }

  return matched.join('\n\n');
}
