// 将线上游客演示团 QY-9696 的导游端口令同步为 123456，不重置任何游客或行程数据。
const fs = require("node:fs");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");

const databasePath = process.argv[2] || "seed/aqian.db";
const envPath = process.argv[3] || ".env.local";
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const secret = env.match(/^COOKIE_SIGNING_SECRET=(.+)$/m)?.[1]?.trim() || "aqian-dev-secret-change-me";
const hash = crypto.createHmac("sha256", secret).update("pin:123456").digest("hex");
const db = new Database(databasePath);
const result = db.prepare("UPDATE tours SET guide_pin_hash = ? WHERE code = ?").run(hash, "QY-9696");
if (!result.changes) throw new Error("未找到演示团 QY-9696");
console.log("QY-9696 导游口令已同步为 123456；游客端与导游端共用同一团数据。 ");
db.close();
