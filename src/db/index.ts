import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

function createDatabase() {
  const sql = neon(getServerEnv().DATABASE_URL);
  return drizzle(sql, { schema });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDb() {
  database ??= createDatabase();
  return database;
}

export type Database = ReturnType<typeof getDb>;
