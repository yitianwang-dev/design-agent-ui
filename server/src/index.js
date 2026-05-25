import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSchema } from './db/index.js';
import jobsRouter from './routes/jobs.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/jobs', jobsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

await initSchema();
app.listen(PORT, () => console.log(`Design Agent Server running on port ${PORT}`));
