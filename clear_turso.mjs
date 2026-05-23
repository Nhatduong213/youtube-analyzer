import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

// Read .env.local manually
const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const turso = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    const res = await turso.execute('DELETE FROM video_snapshots;');
    console.log('Successfully deleted all rows from video_snapshots in Turso.');
  } catch (e) {
    console.error('Error clearing Turso:', e);
  }
}

run();
