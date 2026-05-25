import { createClient } from "@libsql/client/web";

// Next.js server ONLY. Edge Functions (Deno) create their own client via Deno.env.
declare global { var __tursoClient: ReturnType<typeof createClient> | undefined }

if (!global.__tursoClient) {
  global.__tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  });
}

export const turso = global.__tursoClient;
