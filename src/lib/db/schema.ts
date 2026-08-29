/**
 * Drizzle schema —— 与前端 src/lib/demo.ts 的类型逐字段对齐（方案 §四 / INTEGRATION §三）。
 * 时间统一存 UTC（ISO 文本），前端用 formatCnTime 钉 Asia/Shanghai。
 * SQLite 无原生数组：keywords / dont_say / sources 用 JSON 文本列存取。
 */
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/** 团 */
export const tours = sqliteTable("tours", {
  code: text("code").primaryKey(), // 团码即业务主键，如 QY-1024
  name: text("name").notNull(),
  route: text("route").notNull(),
  guideName: text("guide_name").notNull(),
  guidePhone: text("guide_phone").notNull(),
  guidePinHash: text("guide_pin_hash").notNull(),
  status: text("status", { enum: ["draft", "active", "completed"] })
    .notNull()
    .default("active"),
  totalDays: integer("total_days").notNull().default(1),
  currentDay: integer("current_day").notNull().default(1),
  routeKey: text("route_key"), // 模板 key（如 qingyan-north），关联知识卡
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at"),
  createdAt: text("created_at").notNull(),
});

/** 天（多日行程：团 → 天 → 节点） */
export const tourDays = sqliteTable("tour_days", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  dayIndex: integer("day_index").notNull(), // 1-based
  date: text("date").notNull(), // ISO
  title: text("title").notNull(),
});

/** 节点（集合点） */
export const tourStages = sqliteTable("tour_stages", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  dayId: text("day_id")
    .notNull()
    .references(() => tourDays.id),
  seq: integer("seq").notNull(),
  name: text("name").notNull(),
  meetingTime: text("meeting_time").notNull(), // ISO UTC
  point: text("point").notNull(),
  pointHint: text("point_hint").notNull().default(""),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  // 高德 POI（见 INTEGRATION §2.2.5）
  address: text("address"),
  locationLng: real("location_lng"),
  locationLat: real("location_lat"),
  photo: text("photo"),
  /** JSON ScenicStop[]：景区内游览顺序，不与景区间车行路线混用。 */
  scenicStops: text("scenic_stops").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

/** 成员（不存手机号/身份证/轨迹） */
export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  nickname: text("nickname").notNull(),
  memberTokenHash: text("member_token_hash").notNull(),
  language: text("language", { enum: ["zh", "en"] }).notNull().default("zh"),
  interest: text("interest", { enum: ["nature", "culture"] })
    .notNull()
    .default("culture"), // 无 food 选项
  storyLength: text("story_length", { enum: ["short", "deep"] })
    .notNull()
    .default("short"),
  status: text("status", {
    enum: ["joined", "checked_in", "help_pending", "help_acknowledged", "completed"],
  })
    .notNull()
    .default("joined"),
  storyDone: integer("story_done", { mode: "boolean" }).notNull().default(false),
  locationConsent: integer("location_consent", { mode: "boolean" })
    .notNull()
    .default(false),
  joinedAt: text("joined_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

/** 审核知识卡（事实与生成分离的检索源）。按「团」归属：每个团的路线/讲解内容不同，不复用同线路模板。 */
export const knowledgeCards = sqliteTable("knowledge_cards", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code").notNull(),
  routeKey: text("route_key"), // 备份来源（模板 key），可空；检索只看 tour_code
  stageKey: text("stage_key"),
  category: text("category", { enum: ["culture", "facility", "notice"] }).notNull(),
  title: text("title").notNull(),
  contentZhShort: text("content_zh_short").notNull().default(""),
  contentZhDeep: text("content_zh_deep").notNull().default(""),
  contentEnShort: text("content_en_short").notNull().default(""),
  contentEnDeep: text("content_en_deep").notNull().default(""),
  keywords: text("keywords").notNull().default("[]"), // JSON string[]（中英双语）
  dontSay: text("dont_say").notNull().default("[]"), // JSON string[]（禁说/易误解点）
  sourceTitle: text("source_title").notNull(),
  sourceUrl: text("source_url"),
  authorization: text("authorization").notNull().default("verified"),
  verifiedAt: text("verified_at"),
  status: text("status", { enum: ["draft", "verified", "expired"] })
    .notNull()
    .default("verified"),
});

/** 对话消息（intent 非空的即导游端「今日提问」明细来源） */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  memberId: text("member_id"),
  memberNickname: text("member_nickname").notNull().default(""),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  intent: text("intent", {
    enum: ["schedule", "facility", "culture", "delay", "lost", "health", "other"],
  }),
  sourceLabel: text("source_label"), // 拒答的为空
  knowledgeCardIds: text("knowledge_card_ids").notNull().default("[]"), // JSON string[]
  createdAt: text("created_at").notNull(),
});

/** 异常（主链路核心） */
export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  memberId: text("member_id"),
  memberNickname: text("member_nickname").notNull(),
  type: text("type", { enum: ["delay", "lost", "health", "help"] }).notNull(),
  summary: text("summary").notNull(),
  landmarkText: text("landmark_text").notNull().default(""),
  oneTimeLocation: text("one_time_location"), // JSON {lat,lng} | null
  status: text("status", { enum: ["open", "acknowledged", "resolved"] })
    .notNull()
    .default("open"),
  guideResponse: text("guide_response"),
  createdAt: text("created_at").notNull(),
  acknowledgedAt: text("acknowledged_at"),
  resolvedAt: text("resolved_at"),
});

/** 观察任务（故事完成明细）。按「团」归属，与知识卡一致：每团独立、不复用同线路模板。 */
export const storyTasks = sqliteTable("story_tasks", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code").notNull(),
  routeKey: text("route_key"), // 备份来源（模板 key），可空；检索只看 tour_code
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  clues: text("clues").notNull().default("[]"), // JSON string[]
});

/** 故事事件（只记真实听过/答过/选过） */
export const storyEvents = sqliteTable("story_events", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  memberId: text("member_id").notNull(),
  kind: text("kind", { enum: ["listened", "answered", "observed"] }).notNull(),
  refId: text("ref_id").notNull(), // knowledge_card_id / task_id
  payload: text("payload"), // JSON
  createdAt: text("created_at").notNull(),
});

/** 故事卡（存来源 ID，可追溯；不含真名/精确位置/轨迹） */
export const storyCards = sqliteTable("story_cards", {
  id: text("id").primaryKey(),
  tourCode: text("tour_code")
    .notNull()
    .references(() => tours.code),
  memberId: text("member_id").notNull(),
  title: text("title").notNull(),
  owner: text("owner").notNull(), // 昵称
  route: text("route").notNull(),
  date: text("date").notNull(),
  stories: text("stories").notNull().default("[]"), // JSON [{title,note,source}]
  observation: text("observation"), // JSON {task,answer}
  sources: text("sources").notNull().default("[]"), // JSON string[]
  createdAt: text("created_at").notNull(),
});
