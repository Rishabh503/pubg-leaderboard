import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Add it to .env first.');
  process.exit(1);
}

try {
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`SELECT 1 AS connected`;
  if (result[0]?.connected !== 1) throw new Error('Unexpected database response');
  console.log('Neon connection successful. No tables were changed.');
} catch (error) {
  console.error(`Neon connection failed: ${error.message}`);
  process.exit(1);
}
