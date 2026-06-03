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

// PR #29 (2026-06-03): optional `projectName` filter. When a schema's YAML
// declares `meta.projects: [A, B]`, it loads only if projectName matches
// A or B. Schemas with no `projects` field load for ALL projects
// (back-compat — most components are project-agnostic Library primitives).
function schemaMatchesProject(text, projectName) {
  if (!projectName || projectName === 'default') return true;
  // Quick textual check — avoid full YAML parse for ~150 schema files.
  // Match the `projects:` array under `meta:`. If absent, treat as universal.
  const m = text.match(/^\s*projects:\s*\[([^\]]*)\]/m);
  if (!m) return true; // no scope declared → load
  const declared = m[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
  return declared.includes(projectName);
}

export async function loadProductSchemas(productId, projectName) {
  const dir = join(SCHEMAS_DIR, productId);
  const files = await collectSchemaFiles(dir);
  if (files.length === 0) return '';

  const contents = await Promise.all(
    files.map(async ({ abspath, relpath }) => {
      const text = await readFile(abspath, 'utf-8');
      if (!schemaMatchesProject(text, projectName)) return null;
      return `### ${relpath}\n\`\`\`yaml\n${text}\n\`\`\``;
    })
  );

  return contents.filter(Boolean).join('\n\n');
}

// 選定されたコンポーネント名に関連するスキーマだけを返す
export async function loadSchemasForComponents(productId, componentNames, projectName) {
  if (!componentNames.length) return '';

  const dir = join(SCHEMAS_DIR, productId);
  const files = await collectSchemaFiles(dir);
  if (files.length === 0) return '';

  const lowerNames = componentNames.map(n => n.toLowerCase());

  const matched = [];
  for (const { abspath, relpath } of files) {
    const text = await readFile(abspath, 'utf-8');
    if (!schemaMatchesProject(text, projectName)) continue; // PR #29
    const textLower = text.toLowerCase();
    if (lowerNames.some(name => textLower.includes(name))) {
      matched.push(`### ${relpath}\n\`\`\`yaml\n${text}\n\`\`\``);
    }
  }

  return matched.join('\n\n');
}
