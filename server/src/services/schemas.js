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
