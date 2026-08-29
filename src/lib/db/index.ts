/**
 * SQLite + Drizzle 客户端（服务端单进程访问）。
 * DATABASE_URL 形如 file:./seed/aqian.db，解析出真实文件路径。
 * 首次访问自动建表（原型阶段用 push 语义，避免额外迁移步骤）。
 */
import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function resolveDbFile(): string {
  const url = process.env.DATABASE_URL ?? "file:./seed/aqian.db";
  const rel = url.replace(/^file:/, "");
  const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}

// 用全局单例避免开发态热更新反复打开连接
const globalForDb = globalThis as unknown as {
  __aqianSqlite?: Database.Database;
};

function createConnection(): Database.Database {
  const sqlite = new Database(resolveDbFile());
  // Next 在生产构建时会并发加载多个路由模块；WAL 是优化项而非前置条件，
  // 因此先等待短暂锁，竞争失败时保留默认 journal，避免构建阶段相互阻塞。
  sqlite.pragma("busy_timeout = 5000");
  try {
    sqlite.pragma("journal_mode = WAL");
  } catch {
    // 另一个 worker 正在初始化同一演示库时可安全降级。
  }
  sqlite.pragma("foreign_keys = ON");
  ensureSchema(sqlite);
  return sqlite;
}

export const sqlite = globalForDb.__aqianSqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__aqianSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };

/** 原型阶段：直接建表（IF NOT EXISTS），不引入迁移工具链的运行时依赖 */
function ensureSchema(sq: Database.Database) {
  sq.exec(`
    CREATE TABLE IF NOT EXISTS tours (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      route TEXT NOT NULL,
      guide_name TEXT NOT NULL,
      guide_phone TEXT NOT NULL,
      guide_pin_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      total_days INTEGER NOT NULL DEFAULT 1,
      current_day INTEGER NOT NULL DEFAULT 1,
      route_key TEXT,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tour_days (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tour_stages (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      day_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      name TEXT NOT NULL,
      meeting_time TEXT NOT NULL,
      point TEXT NOT NULL,
      point_hint TEXT NOT NULL DEFAULT '',
      is_current INTEGER NOT NULL DEFAULT 0,
      address TEXT,
      location_lng REAL,
      location_lat REAL,
      photo TEXT,
      scenic_stops TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      nickname TEXT NOT NULL,
      member_token_hash TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'zh',
      interest TEXT NOT NULL DEFAULT 'culture',
      story_length TEXT NOT NULL DEFAULT 'short',
      status TEXT NOT NULL DEFAULT 'joined',
      story_done INTEGER NOT NULL DEFAULT 0,
      location_consent INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_cards (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      route_key TEXT,
      stage_key TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content_zh_short TEXT NOT NULL DEFAULT '',
      content_zh_deep TEXT NOT NULL DEFAULT '',
      content_en_short TEXT NOT NULL DEFAULT '',
      content_en_deep TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '[]',
      dont_say TEXT NOT NULL DEFAULT '[]',
      source_title TEXT NOT NULL,
      source_url TEXT,
      authorization TEXT NOT NULL DEFAULT 'verified',
      verified_at TEXT,
      status TEXT NOT NULL DEFAULT 'verified'
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      member_id TEXT,
      member_nickname TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      intent TEXT,
      source_label TEXT,
      knowledge_card_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      member_id TEXT,
      member_nickname TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      landmark_text TEXT NOT NULL DEFAULT '',
      one_time_location TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      guide_response TEXT,
      created_at TEXT NOT NULL,
      acknowledged_at TEXT,
      resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS story_tasks (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      route_key TEXT,
      title TEXT NOT NULL,
      brief TEXT NOT NULL,
      clues TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS story_events (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      member_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS story_cards (
      id TEXT PRIMARY KEY,
      tour_code TEXT NOT NULL,
      member_id TEXT NOT NULL,
      title TEXT NOT NULL,
      owner TEXT NOT NULL,
      route TEXT NOT NULL,
      date TEXT NOT NULL,
      stories TEXT NOT NULL DEFAULT '[]',
      observation TEXT,
      sources TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
  `);
  // 原型数据库已在用户电脑上存在时，补列而不清空任何已创建旅行团。
  try {
    sq.exec("ALTER TABLE tour_stages ADD COLUMN scenic_stops TEXT NOT NULL DEFAULT '[]'");
  } catch {
    // SQLite 无 IF NOT EXISTS；列已存在时忽略即可。
  }
  // 知识卡改为「按团归属」：老库缺 tour_code 列则补列，并按 route_key 回填到对应团。
  const kcCols = sq.prepare("PRAGMA table_info(knowledge_cards)").all() as { name: string }[];
  if (!kcCols.some((c) => c.name === "tour_code")) {
    sq.exec("ALTER TABLE knowledge_cards ADD COLUMN tour_code TEXT");
    sq.exec(
      "UPDATE knowledge_cards SET tour_code = (SELECT code FROM tours WHERE tours.route_key = knowledge_cards.route_key AND code IS NOT NULL LIMIT 1) WHERE tour_code IS NULL"
    );
  }
  // 观察任务同样按团归属。
  const stCols = sq.prepare("PRAGMA table_info(story_tasks)").all() as { name: string }[];
  if (!stCols.some((c) => c.name === "tour_code")) {
    sq.exec("ALTER TABLE story_tasks ADD COLUMN tour_code TEXT");
    sq.exec(
      "UPDATE story_tasks SET tour_code = (SELECT code FROM tours WHERE tours.route_key = story_tasks.route_key AND code IS NOT NULL LIMIT 1) WHERE tour_code IS NULL"
    );
  }
}
