import { Router } from 'express';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const router = Router();

const PROJECTS_PATH = process.env.PROJECTS_PATH
  || resolve(new URL('../../data/projects.json', import.meta.url).pathname);

let _cache = null;

async function loadProjects() {
  if (_cache) return _cache;
  try {
    const raw = await readFile(PROJECTS_PATH, 'utf-8');
    _cache = JSON.parse(raw);
  } catch (err) {
    console.warn(`[projects] failed to load: ${err.message}`);
    _cache = { projects: [] };
  }
  return _cache;
}

// GET /projects — UI dropdown lists known projects
router.get('/', async (_, res) => {
  const data = await loadProjects();
  // Strip _meta and _* helper fields, return only what UI needs
  const trimmed = data.projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    owner: p.owner,
    is_fallback: p._is_fallback === true,
  }));
  res.json({ projects: trimmed });
});

export async function getProjectById(id) {
  if (!id) return null;
  const data = await loadProjects();
  return data.projects.find(p => p.id === id) || null;
}

export default router;
