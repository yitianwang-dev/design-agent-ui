import { Router } from 'express';
import { query } from '../db/index.js';
import { generateFigmaScript } from '../services/claude.js';

const router = Router();

// POST /jobs — フォーム送信→ジョブ作成→非同期でClaude実行
router.post('/', async (req, res) => {
  const { userId, screenName, screenType, selectedTab, specUrl, specText, product } = req.body;

  if (!userId || !screenName || !screenType || (!specUrl && !specText)) {
    return res.status(400).json({ error: '必須パラメータが不足しています' });
  }

  const input = { screenName, screenType, selectedTab, specUrl, specText, product };
  const { rows } = await query(
    'INSERT INTO jobs (user_id, input) VALUES ($1, $2) RETURNING id, status, created_at',
    [userId, JSON.stringify(input)]
  );
  const job = rows[0];

  // 非同期でClaude実行（レスポンスはすぐ返す）
  processJob(job.id, input).catch(console.error);

  res.json({ jobId: job.id, status: job.status });
});

// GET /jobs/:id — ステータス確認
router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'ジョブが見つかりません' });
  res.json(rows[0]);
});

// GET /jobs/pending/:userId — Figmaプラグインが取得するエンドポイント
router.get('/pending/:userId', async (req, res) => {
  const { rows } = await query(
    `SELECT id, input, output_js FROM jobs
     WHERE user_id = $1 AND status = 'pending_plugin'
     ORDER BY created_at ASC LIMIT 1`,
    [req.params.userId]
  );
  res.json(rows[0] || null);
});

// PATCH /jobs/:id — Figmaプラグインが完了報告
router.patch('/:id', async (req, res) => {
  const { status, figmaNode, error } = req.body;
  await query(
    `UPDATE jobs SET status = $1, figma_node = $2, error = $3, updated_at = NOW()
     WHERE id = $4`,
    [status, figmaNode || null, error || null, req.params.id]
  );
  res.json({ ok: true });
});

async function processJob(jobId, input) {
  try {
    await query("UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE id = $1", [jobId]);

    const outputJs = await generateFigmaScript(input);

    await query(
      `UPDATE jobs SET status = 'pending_plugin', output_js = $1, updated_at = NOW() WHERE id = $2`,
      [outputJs, jobId]
    );
  } catch (err) {
    await query(
      `UPDATE jobs SET status = 'error', error = $1, updated_at = NOW() WHERE id = $2`,
      [err.message, jobId]
    );
  }
}

export default router;
