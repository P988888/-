# 阿黔 · 前端完成清单与后端接口预留清单

> 基线：《阿黔_最终开发方案》（Next.js 15 App Router / Tailwind + shadcn/ui / SQLite + Drizzle / Vercel AI SDK / SWR 2s 轮询 / Server Actions）。
> 本文档是前端交付物与后端开发的**唯一对接依据**：每个前端替换点都标注了对应的后端接口签名与数据契约。
> 状态图例：✅ 已完成 · 🔌 后端预留（前端已留好替换点）· ⬜ 后端待开发

---

## 一、前端交付清单（已完成）

### 1.1 设计系统与基础设施

- [x] ✅ 「青岩蜡染」设计 tokens：`aqian/src/app/globals.css`（`qian` 靛蓝 / `cinnabar` 朱砂 / `paper` 宣纸 / `pine` 松金 / `moss` 青石绿、`font-display` 衬线标题、`batik-deep` / `batik-band` / `paper-grain` / `stone-wall` 质感类、`pb-safe` 安全区）
- [x] ✅ 根布局：`aqian/src/app/layout.tsx`（zh-CN、H5 viewport、`viewportFit: cover`、themeColor）
- [x] ✅ shadcn 风格组件：`aqian/src/components/ui/`（`button.tsx` 按钮最低 h-11=44px、`card.tsx`、`badge.tsx`、`input.tsx`）
- [x] ✅ 品牌组件：`aqian/src/components/aqian-avatar.tsx`（山间迎客松 SVG）、`aqian/src/components/app-shell.tsx`（H5 ≤430px 居中容器）
- [x] ✅ 工具函数：`aqian/src/lib/utils.ts`（`cn()`、`formatCnTime` / `formatCnDate` 钉死 Asia/Shanghai）
- [x] ✅ 演示数据：`aqian/src/lib/demo.ts`（**后端接入时整体由 Drizzle 查询替换，见 §三**）

### 1.2 页面（6 条路由）

- [x] ✅ `/` 入口页 `aqian/src/app/page.tsx`：品牌区 + 三入口 + 差异化三点
- [x] ✅ `/join` 三步进团 `aqian/src/app/join/page.tsx`：团码 → 昵称 → 语言/兴趣（不注册、不收手机号）
- [x] ✅ `/tour/[tourCode]` 游客端 `aqian/src/app/tour/[tourCode]/page.tsx` + `aqian/src/components/tourist/`
- [x] ✅ `/guide` 导游口令入口 `aqian/src/app/guide/page.tsx`（含「创建新旅行团」入口）
- [x] ✅ `/guide/new` 创建旅行团 `aqian/src/app/guide/new/page.tsx`：4 步流程（团信息 → 线路模板 → 首个集合点 → 导游口令）→ 生成团码 + 二维码
- [x] ✅ `/guide/[tourCode]` 驾驶舱 `aqian/src/app/guide/[tourCode]/page.tsx` + `aqian/src/components/guide/`：**底部导航栏 5 个界面**，不再单页堆叠
- [x] ✅ `/story/[storyCardId]` 故事卡 `aqian/src/app/story/[storyCardId]/page.tsx`

### 1.3 游客端组件与已实现的演示交互

| 组件 | 文件 | 已实现交互（演示态） |
|---|---|---|
| 阿黔状态栏 | `tourist/aqian-header.tsx` | 在线点 + 「正与周导共同服务本团」常驻信任提示 |
| 下一集合卡 | `tourist/meeting-card.tsx` | 秒级倒计时（Asia/Shanghai）、集合点/提示、来源标注「导游 HH:mm 更新」、超时态 |
| 全程行程卡（多日） | `tourist/stage-card.tsx` | 按天手风琴：已结束天打标收起、今天展开、未来灰显；天切换自动跟随 currentDay |
| 四个大按钮 | `tourist/quick-actions.tsx` | ≥44px、「我需要帮助」朱砂红唯一真人入口 |
| 对话区 | `tourist/chat-panel.tsx` | 来源 chip、打字中指示、自动滚底 |
| 异常操作卡 | `tourist/alert-card.tsx` | 四类型选择 → 确认卡（仅通知/分享一次位置/拨打电话）→ 等待确认 → 结果回传（演示用 setTimeout 模拟） |
| 组合与规则层演示 | `tourist/tourist-app.tsx` | 快捷问→预置答案；自由输入：集合词→读库答案 / 风险词→弹异常卡 / 文化词→检索答案 / **其他→拒答硬门文案** |

### 1.4 导游端已实现的演示交互（底部导航 5 Tab 结构）

| Tab | 文件 | 已实现交互 |
|---|---|---|
| 导航栏 | `guide/tab-bar.tsx` | 5 Tab 切换；「异常」Tab 待办角标（红色只给它）；激活态顶部指示条 |
| ① 异常 | `guide/panels/alerts-panel.tsx` | 「已联系，原地等候」→ 回执展示 + 成员状态联动「已跟进」→「标记已解决」；空队列有引导态 |
| ② 成员 | `guide/panels/members-panel.tsx` | 状态徽章（已加入/已签到/求助中/已跟进）；松金书本图标标记故事完成 |
| ③ 行程 | `guide/panels/schedule-panel.tsx` | 集合信息内联编辑，保存后显示「已于 HH:mm 保存，2 秒内同步全团」；全程节点时间线 |
| ④ 数据 | `guide/panels/insights-panel.tsx` | **概览卡可点进详情**：今日提问明细（类型筛选 + 每条带来源/拒答标记）、故事任务详情（任务卡 + 进度条 + 每人完成情况 + 查看故事卡）；意图分布条形图 |
| ⑤ 设置 | `guide/panels/settings-panel.tsx` | 入团二维码、修改口令入口、一键重置（限本团码）、**创建新旅行团**、退出驾驶舱 |

### 1.5 验收硬门的前端落点（已完成部分）

- [x] ✅ 核心按钮 ≥44px；375px 无横滚（`max-w-[430px]` + 无固定超宽元素）
- [x] ✅ 异常状态图标+文字双编码，不只靠红色
- [x] ✅ 每条事实性回答渲染来源标注（集合/设施/文化三类）
- [x] ✅ 模型断开时集合卡/行程卡/快捷问仍可用（全部本地数据，不依赖 AI）

---

## 二、后端预留接口清单（按模块）

> 约定：所有数据变更走 **Server Actions**；仅两个 API 路由 `/api/chat`、`/api/status`；
> 前端所有演示逻辑集中在 `tourist-app.tsx` 的 `onSend` / `AlertCard` 的 `setTimeout` / `demo.ts`，替换时**不动展示组件**。

### 2.1 鉴权与安全 🔌

| # | 接口 | 说明 | 前端替换点 |
|---|---|---|---|
| A1 | ⬜ `issueMemberToken(tourCode, nickname, language, interest)` → 签发 `member_token`，写 **HttpOnly + SameSite=Lax 签名 Cookie** | `/join` 第 3 步提交时调用 | `app/join/page.tsx` 的 `router.push` 前改为调用 Action |
| A2 | ⬜ `verifyGuidePin(tourCode, pin)` → 校验 `tours.guide_pin_hash`，写导游签名 Cookie | `/guide` 提交 | `app/guide/page.tsx` 的 `canEnter` 提交处 |
| A3 | ⬜ middleware/helper：`requireMember(tourCode)`、`requireGuide(tourCode)` | 所有 Action 与 `/api/chat`、`/api/status` 入口校验 token 与团的归属 | 游客/导游两个 `[tourCode]` 页面的服务端数据加载处 |
| A4 | ⬜ `/api/chat` 每 member 限流（游园会防刷） | 简单滑动窗口即可 | 无（后端内部） |
| A5 | ⬜ `COOKIE_SIGNING_SECRET` 签名（jose） | 密钥只在服务端，日志不打印 | 无 |

### 2.2 团与行程（tour-actions.ts）🔌

```ts
// ⬜ src/actions/tour-actions.ts
export async function createTour(input: {
  name: string; guideName: string;
  startDate: string;                   // 出发日期（Asia/Shanghai 的 yyyy-mm-dd）
  mode: 'template' | 'custom';         // 模板线路 或 自定义行程
  routeKey?: string;                   // mode='template' 时的模板 key
  days: { title: string; stages: { time: string; name: string; point: string }[] }[];
  //   多日行程（1—10 天）：每天一个主题 + 若干集合节点；模板只作为 days 的预填值
  guidePin: string;                    // 4—6 位数字，服务端哈希存 guide_pin_hash
}): Promise<{ ok: true; tourCode: string }>
//   生成团码 + 写 tour_days/tour_stages（模板知识卡按 routeKey 关联）+ 签发导游 Cookie（复用 A2）

export async function getTourByCode(tourCode: string): Promise<TourDTO | null>
//   → 供 /tour/[tourCode] 与 /guide/[tourCode] 服务端读取
//   TourDTO = { code, name, route, guideName, guidePhone, status: TourStatus, totalDays, currentDay }

export async function getDays(tourCode: string): Promise<TourDayDTO[]>
//   TourDayDTO = 现 demo.ts 的 TourDay（day/date/title/stages: StageDTO[]）
//   StageDTO = 现 demo.ts 的 Stage（seq/name/meetingTime(ISO UTC)/point/pointHint/updatedAt/isCurrent)
//   时间存 UTC，前端已用 formatCnTime 钉 Asia/Shanghai，无需改
//   「今天/已结束/未开始」由 tours.current_day 推导，前端 dayStatus() 已实现

export async function updateMeetingInfo(input: {
  tourCode: string; stageId: string; meetingTime: string; meetingPoint: string
}): Promise<{ ok: true; updatedAt: string }>
//   校验导游 Cookie；写 tour_stages.updated_at → /api/status 轮询把变化推给游客端

export async function advanceTourDay(tourCode: string): Promise<{ ok: true; currentDay: number }>
//   校验导游 Cookie；tours.current_day + 1（不超过 total_days）
//   → /api/status 推送后：游客端当天自动标记「已结束」并切换到下一天（前端已按 currentDay 渲染）
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `app/guide/new/page.tsx` 4 步表单（含逐天编辑器） | 本地 state → `createTour`，返回真团码后跳 `/guide/[code]`；完成页 QR 值同步替换 |
| `app/tour/[tourCode]/page.tsx` | `demoDays/demoTour.currentDay` → `getDays` + `getTourByCode` |
| `panels/schedule-panel.tsx` 节点「保存」 | 本地 setState → `updateMeetingInfo` Action |
| `panels/schedule-panel.tsx` 「结束今天，进入 Day N+1」 | 本地 setCurrentDay → `advanceTourDay` Action |
| `meeting-card.tsx` 来源行 | 已渲染 `updatedAt`，只需后端真值 |

### 2.2.5 定位与路线（高德地图 Web 服务）🔌

> 前端已用 `src/lib/poi.ts`（内置贵州 POI 演示集）跑通全部交互；
> 上真实高德时只需实现下面两个服务端代理并把 `searchPoi` 改成请求 `/api/poi/search`——**调用方已是异步签名，UI 零改动**。

```ts
// ⬜ src/app/api/poi/search/route.ts   GET ?keywords=黄果树瀑布
//   服务端代理：https://restapi.amap.com/v3/place/text?key=AMAP_KEY&keywords=&city=贵州&citylimit=false
//   响应结构与 src/lib/poi.ts 的 Poi[] 对齐：{ id, name, address, location:{lng,lat}, photo? }
//   key 仅在服务端（AMAP_KEY 环境变量），浏览器永不接触；建议加每团限流

// ⬜ src/app/api/poi/direction/route.ts   GET ?from=lng,lat&to=lng,lat
//   服务端代理：https://restapi.amap.com/v3/direction/driving
//   返回 RouteLeg { distanceKm, durationMin }；前端 planRoute() 目前是坐标×山区系数估算
//   可选：/v4/staticmap 生成真实静态路线图替换 RouteMap 示意图（组件 props 契约不变）
```

```ts
// ⬜ 集合点照片上传（tour-actions.ts 或独立 upload 路由）
export async function uploadStagePhoto(input: FormData): Promise<{ ok: true; url: string }>
//   原型期：存 public/uploads/ 或直读 base64；正式：对象存储 + CDN，url 写 tour_stages.photo_url
//   前端现状：创建页用 URL.createObjectURL 本地预览，提交 createTour 时一并上传
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `components/poi-input.tsx` | `searchPoi` 内置集 → `/api/poi/search`（高德 place/text） |
| `app/guide/new/page.tsx` 照片上传 | `URL.createObjectURL` 本地预览 → `uploadStagePhoto` 返回真 url |
| `components/route-map.tsx` | 示意图 → 可选换高德 staticmap；`planRoute` 估算 → `/api/poi/direction` 真值 |
| `tour_stages` 表 | 补 `address`、`location_lng/lat`、`photo_url` 三列（demo.ts 的 Stage 已带同名字段） |

### 2.3 成员（member-actions.ts）🔌

```ts
// ⬜ src/actions/member-actions.ts
export async function joinTour(input: {
  tourCode: string; nickname: string;
  language: 'zh' | 'en'; interest: 'nature' | 'culture';   // 注意：无 food 选项
  storyLength?: 'short' | 'deep';
}): Promise<{ ok: true; memberId: string }>   // 内部完成 A1 的 token 签发

export async function getMembers(tourCode: string): Promise<MemberDTO[]>
//   MemberDTO = 现 demo.ts 的 Member（不存手机号/身份证/轨迹）

export async function heartbeat(): Promise<void>
//   游客端轮询时顺带更新 members.last_seen_at
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `app/join/page.tsx` | 本地 state → `joinTour`，失败态（团码不存在/口令错误）需加 toast/提示 |
| `guide-app.tsx` 成员列表 | `demoMembers` → `getMembers` + 轮询刷新 |

### 2.4 异常闭环（alert-actions.ts）—— 主链路核心 🔌

```ts
// ⬜ src/actions/alert-actions.ts
export type AlertType = 'delay' | 'lost' | 'health' | 'help'

export async function createAlert(input: {
  tourCode: string; type: AlertType;
  summary: string;                    // 规则层生成的固定模板，不自由发挥
  landmarkText: string;               // 从导游核验地标中选择
  oneTimeLocation?: { lat: number; lng: number } | null  // 仅用户主动授权的一次性位置
}): Promise<{ ok: true; alertId: string }>
//   需 member token；规则层命中风险词时由 /api/chat 直接创建，不经过模型裁定

export async function acknowledgeAlert(input: {
  alertId: string; response: string   // 如「已联系，请原地等候，集合顺延 10 分钟」
}): Promise<{ ok: true }>
//   需导游 Cookie；写 acknowledged_at + guide_response → 回传游客端

export async function resolveAlert(input: { alertId: string }): Promise<{ ok: true }>
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `alert-card.tsx` `submit()` 的 `setTimeout(2600)` | → `createAlert` 后轮询等待 `acknowledged` 状态 |
| `tourist-app.tsx` 风险词分支 | 保留规则层演示逻辑 → 迁入后端 `lib/ai/safety.ts`，前端只负责弹卡 |
| `guide-app.tsx` `acknowledge/resolve` | 本地 setState → Action 调用；列表改由轮询驱动 |

### 2.5 AI 问答（/api/chat）🔌

```ts
// ⬜ src/app/api/chat/route.ts   POST
// 请求
{ tourCode: string; message: string }          // member token 走 Cookie，不放 body
// 响应（两种形态）
//  a) 流式文本（文化/设施改写）：Vercel AI SDK streamText，前端读取流
//     头部先返回 JSON meta: { intent, sourceIds, sourceLabel }，再回流式正文
//  b) 非流式（集合/拒答/异常卡指令）：
{ kind: 'schedule' | 'refusal' | 'alert_card',
  text: string, sourceLabel?: string,
  alertType?: AlertType }
```

规则（方案 §五，前端已按此演示）：
- 集合/时间 → 100% 读 `tour_stages`，模型不参与；
- 迟到/迷路/不适/求助 → 关键词命中即 `createAlert`，返回 `alert_card` 指令让前端弹卡；
- 设施/文化 → 只检索 `status='verified'` 的 `knowledge_cards`，**命中不到 → 固定拒答文案（硬门，不调模型）**；
- 命中后由模型按 language/story_length 改写（标准路径先 `generateObject` 定 intent/sourceIds）。

| 前端替换点 | 现状 → 目标 |
|---|---|
| `tourist-app.tsx` `onSend` 整个 if 链 | → `POST /api/chat`；`kind:'alert_card'` 时 `setAlertOpen(true)`；流式时增量渲染（`chat-panel.tsx` 已支持追加，加流式状态即可） |
| `chat-panel.tsx` 来源 chip | 已消费 `sourceLabel`，契约不变 |
| 拒答文案 | 已在 `tourist-app.tsx` 的 `refusalMessage`，文案一字不动迁到后端常量 |

### 2.6 状态同步（/api/status）🔌

```ts
// ⬜ src/app/api/status/route.ts   GET
// 查询参数: ?tourCode=QY-1024&since=<ISO 时间戳>&role=member|guide
// 响应（只返回增量，最小数据）:
{
  serverTime: string,
  currentDay?: number,                    // advanceTourDay 后推送，驱动游客端切天
  days?: TourDayDTO[],                    // 有节点 updated_at 晚于 since 的天才带（含其 stages）
  alerts?: AlertDTO[],                    // 游客端只回自己的；导游端回全团
  members?: MemberDTO[],                  // 仅 role=guide
  stats?: { questionCount: number; storyDone: number; memberTotal: number }
}
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| 新增：`tourist-app.tsx` / `guide-app.tsx` 挂载 SWR（2s，`refreshInterval: 2000`） | 当前纯本地 state → SWR 数据驱动，本地 setState 逻辑删除 |
| `alert-card.tsx` 等待确认态 | → 轮询到自己 alert `acknowledged` 即切 `done` |
| `guide-app.tsx` 概览数字 23 / 4/6 | → `stats` 真值 |

### 2.6.5 数据概览明细（insight-actions.ts）🔌

```ts
// ⬜ src/actions/insight-actions.ts（导游 Cookie 校验）
export async function getQuestions(input: {
  tourCode: string; intent?: 'schedule' | 'facility' | 'culture' | 'other'
}): Promise<QuestionItem[]>
//   QuestionItem 结构 = 现 demo.ts 的 demoQuestions（含 sourceLabel；拒答的无 sourceLabel）

export async function getStoryProgress(tourCode: string): Promise<{
  task: { title: string; brief: string; clues: string[] };
  done: number; total: number;
  perMember: { memberId: string; nickname: string; storyDone: boolean; storyCardId?: string }[]
}>
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `panels/insights-panel.tsx` 问题明细页 | `demoQuestions` → `getQuestions`（筛选 chips 传 intent 参数） |
| `panels/insights-panel.tsx` 故事详情页 | `demoStoryTask` + member.storyDone → `getStoryProgress`；「查看故事卡」用真 storyCardId |
| `panels/insights-panel.tsx` 意图分布条形图 | 由 `getQuestions` 结果前端聚合，契约不变 |

### 2.7 故事卡（story-actions.ts）🔌

```ts
// ⬜ src/actions/story-actions.ts
export async function recordStoryEvent(input: {
  tourCode: string; kind: 'listened' | 'answered' | 'observed';
  refId: string;                        // knowledge_card_id / 任务 id
  payload?: Record<string, unknown>
}): Promise<{ ok: true }>
//   游客「听完故事 / 答完观察题」时调用；只记真实行为

export async function generateStoryCard(input: {
  tourCode: string
}): Promise<{ ok: true; storyCardId: string } | { ok: false; reason: 'no_events' }>
//   无真实 story_events 时不生成（硬门）；文案可由模型润色但来源 ID 必须可追溯

export async function getStoryCard(storyCardId: string): Promise<StoryCardDTO | null>
//   StoryCardDTO 结构 = 现 demo.ts 的 demoStoryCard（不含真名/精确位置/轨迹）
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `app/story/[storyCardId]/page.tsx` | `demoStoryCard` → `getStoryCard`，`params.storyCardId` 已就位 |
| 游客端「听当前故事」按钮 | 追加 `recordStoryEvent({kind:'listened'})` |

### 2.8 Demo 运维 🔌

```ts
// ⬜ src/actions/tour-actions.ts（或独立 admin-actions.ts）
export async function resetDemoTour(input: {
  tourCode: string; secret: string      // DEMO_RESET_SECRET，限 tour 作用域
}): Promise<{ ok: true }>
//   只重置指定团码，不影响游园会观众团
```

| 前端替换点 | 现状 → 目标 |
|---|---|
| `guide-app.tsx` 「一键恢复初始 Demo 团」 | `window.location.reload()` → `resetDemoTour` + `router.refresh()` |

---

## 三、数据模型映射（demo.ts ↔ Drizzle schema）

> 前端 `aqian/src/lib/demo.ts` 的类型已与方案 §四对齐，建表时逐字段对应即可。

| demo.ts 导出 | 目标表 | 备注 |
|---|---|---|
| `demoTour` | `tours` | 补 `guide_pin_hash`、`status`、`starts_at/ends_at`、`total_days`、`current_day` |
| `demoDays` (`TourDay`) | `tour_days` + `tour_stages` | 新增 `tour_days`（tour_id/day_index/date/title）；`tour_stages` 挂 `day_id`；`meetingTime` ↔ `meeting_time`(UTC)；`pointHint` 可并入 `meeting_point_text`；**`address`/`location`/`photo` ↔ `address`/`location_lng,location_lat`/`photo_url`（高德 POI 与照片，见 §2.2.5）** |
| `demoMembers` (`Member`) | `members` | `interest` 只有 `nature/culture`；无 `food` |
| `demoAlerts` (`GuideAlert`) | `alerts` | `one_time_location` nullable；三个时间戳 |
| `demoMessages` (`ChatMessage`) | `messages` | `source` ↔ 由 `knowledge_card_ids` 关联生成 `sourceLabel` |
| `demoStoryCard` | `story_events` + `story_cards` | 卡内存只存来源 ID，展示时 join |
| `cannedAnswers` | `knowledge_cards` | 三条预置答案即三条 verified 知识卡（`route_key='qingyan-north'`） |
| `demoQuestions` | `messages`（intent 非空） | `sourceLabel` 由 `knowledge_card_ids` join 生成 |
| `demoStoryTask` / `routeTemplates` | 种子常量（`seed/`） | 线路模板与观察任务属预置内容，不入业务表亦可 |

⬜ 待后端补建：`knowledge_cards`（含 `keywords` 中英 JSON、`dont_say[]`、`authorization`、`verified_at`、`status`）——前端来源 chip 的 `sourceLabel` 由 `source_title` 生成。

---

## 四、环境变量（.env.example 直接可用）

```text
NEXT_PUBLIC_APP_URL=        # 二维码指向的访问地址（局域网 IP 或备用服务器域名）
DATABASE_URL=file:./seed/aqian.db
LLM_BASE_URL=               # 任意 OpenAI 协议 /v1 地址
LLM_MODEL=
LLM_API_KEY=                # 仅服务端
AMAP_KEY=                   # 高德 Web 服务 key（POI 搜索/路线规划，仅服务端代理使用）
COOKIE_SIGNING_SECRET=      # jose 签名
DEMO_RESET_SECRET=
```

前端用到 `NEXT_PUBLIC_APP_URL` 的位置：`guide-app.tsx` 与 `story/[storyCardId]/page.tsx` 的 `<QRCodeSVG value=...>`（现为 `https://aqian.demo` 占位）。

---

## 五、联调顺序建议（对齐方案 §九）

1. ⬜ 阶段 0：`drizzle/schema.ts` 按 §三建表 + `seed/` 种子（种子内容 = 现 `demo.ts`，直接迁移）
2. ⬜ 阶段 1：A1–A3 鉴权 + `getTourByCode/getDays` → 两端按同一 tourCode 显示真团名与多日行程
3. ⬜ 阶段 2：`joinTour` + `createAlert` → 关模型走完「进团→提交异常」
4. ⬜ 阶段 3：`/api/status` + `acknowledgeAlert` → 异常 2 秒闭环（前端接 SWR）
5. ⬜ 阶段 4：`/api/chat` 规则层/检索/拒答硬门 → 替换 `tourist-app.tsx` 演示 if 链
6. ⬜ 阶段 5：`recordStoryEvent/generateStoryCard` → 故事卡只引真实内容
7. ⬜ 阶段 6：Playwright 三条 E2E（加入→可见 / 异常→确认→回传 / 故事任务→卡→分享）

> 前端原则：**展示组件不动，只换数据来源**；任何接口未完成时，页面回退 `demo.ts` 数据仍可用于演示。
