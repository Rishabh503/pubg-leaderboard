import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export default async function handler(request, response) {
  if (!sql) return response.status(503).json({ error: 'DATABASE_URL is not configured in Vercel project settings' });

  try {
    await sql`CREATE TABLE IF NOT EXISTS pubg_trio_leaderboard_state (id smallint PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;

    if (request.method === 'GET') {
      const rows = await sql`SELECT data FROM pubg_trio_leaderboard_state WHERE id = 1`;
      return response.status(200).json({ data: rows[0]?.data ?? null });
    }

    if (request.method === 'PUT') {
      const data = request.body?.data;
      if (!data || !Array.isArray(data.players) || data.players.length !== 3 || !Array.isArray(data.matches)) {
        return response.status(400).json({ error: 'Invalid leaderboard data' });
      }
      await sql`INSERT INTO pubg_trio_leaderboard_state (id, data) VALUES (1, ${JSON.stringify(data)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      return response.status(200).json({ ok: true });
    }

    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Leaderboard API failed:', error.message);
    return response.status(500).json({ error: 'Could not access shared leaderboard data' });
  }
}
