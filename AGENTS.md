<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 阿黔项目上下文（贵客松·文旅赛道）

## 产品边界

- 产品名：**阿黔**，贵州文旅场景的“AI 副导”。真人导游负责带团与决策，阿黔只承接信息、行程、故事和异常信号。
- 游客入口：`/` 封面 → `/join` 扫码/团码进团 → `/tour/[tourCode]` 游客端。
- 导游入口：仅 `/guide`，输入导游口令后进入 `/guide/[tourCode]`；游客端不应展示导游入口。
- 游客端主导航：首页、行程、我的。故事卡在“我的”；导游端有独立的复盘故事卡。

## 当前实现的重要能力

### 旅行团与行程

- 创建团：`src/app/guide/new/page.tsx`，包含团信息、线路方式、逐天行程、导游口令和完成页。
- 导游联系电话为必填，并同步显示在游客端“我的”。
- 每日上层单位统一称为**游览节点**，可用于集合、游览、用餐或返程；不要重新改回“集合节点”。
- 每个节点可选上传真实照片。上传接口 `POST /api/upload/meeting-photo` 将 JPG/PNG/WebP（≤5MB）保存到 `public/uploads/meeting-points/`，数据库只保存 `/uploads/...` URL。游客集合卡优先显示该照片。
- 同一景区内的细分步行点是可选的、默认收起的功能：`ScenicStopsEditor`。只有需细分步道时才填写；若已另建独立游览节点，不应重复添加。
- `tour_stages.scenic_stops` 为 JSON `ScenicStop[]`，包含景区内步行点。旧 SQLite 库由 `ensureSchema` 使用 `ALTER TABLE` 无损补列。

### 地图与地点

- 所有地点搜索通过 `GET /api/poi/search?q=` 服务端代理高德 `v3/place/text`，浏览器永远拿不到高德 Key。
- `src/lib/poi.ts` 的 `searchPoi` **只使用高德真实 POI**；不要恢复“高德失败时静默回退预设地点”的旧逻辑。失败/无结果须在 `PoiInput` 中明确提示。
- 景区之间：`RouteMap` 以 `mode="driving"` 调用高德 v5 驾车路线。
- 景区内部：`RouteMap` 以 `mode="walking"` 调用高德 **v3** 步行路线。v5 步行接口仅有文字指引、没有 polyline，不能用于真实地图绘制。
- 路线接口：`POST /api/amap/route`；仅本团导游或已进团游客可请求。静态地图由服务端转为 data URL，避免泄露高德 Key。

### 千问智能补全行程

- API：`POST /api/itinerary/ai-plan`。
- 交互：导游只填写“当日主题 + 每个关键时间节点”；点击“阿黔智能补全本日点位”后，系统用高德候选 POI + 千问 `qwen3.8-max` 排序补齐空白地点。
- 安全约束：模型仅可返回高德候选的 `poiId`；地址和坐标永远取高德结果。手动已定位的节点为锁定节点，不会被覆盖。
- 模型配置只存在 `.env.local`：
  - `LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
  - `LLM_MODEL=qwen3.8-max`
  - `LLM_API_KEY=<secret>`
- 不要提交或回显 `LLM_API_KEY`、`AMAP_KEY`、`TENCENT_MAP_KEY`。Qwen3.8-Max 为推理模型，接口超时设置为 60 秒，前端已有加载态。
- 最近已用当前本地配置成功验证“黄果树大瀑布游览 + 3 个时间节点”可返回带高德真实坐标的行程。

## 数据与主要文件

- SQLite：默认 `seed/aqian.db`，schema `src/lib/db/schema.ts`，建表/兼容补列 `src/lib/db/index.ts`。
- 读取 DTO：`src/lib/db/queries.ts`；创建/更新行动：`src/actions/tour-actions.ts`。
- 演示团：`QY-1024`，导游口令 `2468`（仅演示）。`seedDemoTour(true)` 会重置该演示团，不能对其他团做破坏性重置。
- 游客端行程：`src/components/tourist/stage-card.tsx`；下一集合卡：`src/components/tourist/meeting-card.tsx`。
- 导游行程编辑：`src/components/guide/panels/schedule-panel.tsx`。
- 高德服务：`src/lib/amap.ts`；POI 服务：`src/app/api/poi/search/route.ts`；智能行程：`src/app/api/itinerary/ai-plan/route.ts`。

## 开发与验证

- 运行：`pnpm dev`，当前本地服务为 `http://localhost:3001`（3000 常被占用）。
- 每次功能修改至少执行：`pnpm exec tsc --noEmit`；涉及路由/服务端代码时再执行 `pnpm build`。
- 已知非阻塞警告：Next.js 建议 TypeScript ≥5.1（当前 5.0.2），以及 `src/lib/db/index.ts` 的动态文件路径 tracing 警告。
- UI 改动遵循移动端优先、明确错误/加载态、44px 以上触控目标。多步骤表单不得只禁用“下一步”而不给出原因；当前创建团会标注 `待补全` 并跳到第一个未完成 Day。
