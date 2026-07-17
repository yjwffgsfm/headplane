import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

import log from "~/utils/log";

export async function createDbClient(path: string) {
  const realPath = resolve(path);
  try {
    await mkdir(dirname(realPath), { recursive: true });
  } catch (error) {
    log.error(
      "server",
      "无法在 %s 创建数据库目录：%s",
      realPath,
      error instanceof Error ? error.message : String(error),
    );
    throw new Error(`无法在 ${realPath} 创建数据库目录`);
  }

  const db = drizzle(realPath);
  migrate(db, {
    migrationsFolder: "./drizzle",
  });

  return db;
}