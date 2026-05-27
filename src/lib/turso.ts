import { createClient } from "@libsql/client/web";

// Fail-fast: crash at module load if required env vars are missing
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  throw new Error(
    "[turso] Missing required environment variables: TURSO_DATABASE_URL and/or TURSO_AUTH_TOKEN"
  );
}

// Next.js server ONLY. Edge Functions (Deno) create their own client via Deno.env.
declare global { var __tursoClient: ReturnType<typeof createClient> | undefined }

if (!global.__tursoClient) {
  global.__tursoClient = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });
}

export const turso = global.__tursoClient;
