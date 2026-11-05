import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return (cached ??= drizzle(postgres(url, { max: 1, prepare: false }), { schema }));
}
