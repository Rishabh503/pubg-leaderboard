import 'dotenv/config';
import express from 'express';
import { neon } from '@neondatabase/serverless';

const app = express();
const port = Number(process.env.PORT || 3001);
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ configured: Boolean(sql) }));
app.get('/api/leaderboard', async (_req, res) => {
  if (!sql) return res.status(503).json({ error: 'DATABASE_URL is not configured' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS pubg_trio_leaderboard_state (id smallint PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
    const rows = await sql`SELECT data FROM pubg_trio_leaderboard_state WHERE id = 1`;
    res.json({ data: rows[0]?.data ?? null });
  } catch (error) {
    console.error('Leaderboard read failed:', error.message);
    res.status(500).json({ error: 'Could not load leaderboard data' });
  }
});
app.put('/api/leaderboard', async (req, res) => {
  if (!sql) return res.status(503).json({ error: 'DATABASE_URL is not configured' });
  const data = req.body?.data;
  if (!data || !Array.isArray(data.players) || data.players.length !== 3 || !Array.isArray(data.matches)) return res.status(400).json({ error: 'Invalid leaderboard data' });
  try {
    await sql`CREATE TABLE IF NOT EXISTS pubg_trio_leaderboard_state (id smallint PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
    await sql`INSERT INTO pubg_trio_leaderboard_state (id, data) VALUES (1, ${JSON.stringify(data)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    res.json({ ok: true });
  } catch (error) {
    console.error('Leaderboard write failed:', error.message);
    res.status(500).json({ error: 'Could not save leaderboard data' });
  }
});

app.listen(port, () => console.log(`Leaderboard API listening on ${port}`));
