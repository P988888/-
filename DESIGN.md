# 阿黔前端设计系统 ·「青岩蜡染」

> 对应《阿黔_最终开发方案》§三目录结构中的页面与组件层。本文件记录视觉决策，方便后续接入后端（Server Actions / Drizzle / Vercel AI SDK）时保持口径一致。

## 一、色彩语义（globals.css `@theme`）

| Token | 色值 | 语义 | 使用规则 |
|---|---|---|---|
| `qian-50…950` | 蜡染靛蓝 | 品牌主色、阿黔、可信赖的信息 | 主按钮、集合卡倒计时、页头 |
| `cinnabar-50…800` | 朱砂红 | **只给异常与真人导游** | 「我需要帮助」、异常操作卡、导游端待办 |
| `paper` `#f6f1e6` / `card` `#fffdf6` | 宣纸米白 | 页面底、卡片底 | 全局 |
| `pine-100…600` | 松金 | 贵客松点缀、来源标注 | 来源 chip、故事卡、已跟进状态 |
| `moss-100…700` | 青石绿 | 正常 / 已完成状态 | 在线点、已签到、异常已解决 |

硬性规则（对应方案验收硬门）：
1. **红色只给待处理异常**——导游端其余模块一律不用红；
2. 异常状态**图标 + 文字**双编码（`alert-pulse` 呼吸阴影只是辅助，不做唯一提示）；
3. 核心按钮高度 ≥44px（`Button` 的 `default` 起即 h-11）；
4. 每条事实性回答（集合/设施/文化）必须渲染**来源标注**（`ShieldCheck` / `BookOpenCheck` + 文案）。

## 二、质感

- `.batik-deep`：靛蓝径向渐变 + 松金微光，用于页头与故事卡头；
- `.batik-band`：蜡染连环纹 SVG 装饰带，出现在每个深色区的顶缘；
- `.paper-grain`：宣纸细点纹，全局底与故事卡身；
- `.stone-wall`：青岩石板纹理，集合点照片占位（正式版替换为导游实拍图，`public/demo/`）。

## 三、字体

- 标题 `font-display`：中文衬线（Songti SC / Noto Serif SC 系统栈，构建期零网络依赖）；
- 正文 `font-body`：PingFang SC 系统栈；
- 数字倒计时：`font-mono tabular-nums`，避免跳秒抖动。

## 四、页面与组件映射

| 路由 | 组成 | 关键交互（原型演示态） |
|---|---|---|
| `/` | AppShell + AqianAvatar + 特性卡 | 三个入口：游客 / 导游 / 故事卡 |
| `/join` | 3 步进团（团码→昵称→语言/兴趣） | 演示团码一键填入 QY-1024 |
| `/tour/[tourCode]` | AqianHeader / MeetingCard / StageCard / QuickActions / ChatPanel / AlertCard | **多日行程按天手风琴**（已结束收起打标 / 今天展开 / 未来灰显），随 currentDay 自动切天；倒计时（Asia/Shanghai）；快捷问触发预置答案；风险词→异常操作卡；知识库外→拒答硬门文案 |
| `/guide` | 团码 + 口令 + 创建新团入口 | 演示口令 2468 |
| `/guide/new` | 创建旅行团 4 步流程（支持 1—10 天多日团） | 团信息+出发日期+天数 → 模板或自定义 → 逐天编辑（**POI 搜索定位 + 集合点照片**）→ 口令 → 团码 + 二维码 + **自动路线规划** |
| `/guide/[tourCode]` | **底部导航 5 Tab**：异常 / 成员 / 行程 / 数据 / 设置 | 异常 Tab 红色待办角标；「已联系」→ 成员联动「已跟进」；行程 Tab **按天切换编辑 + 「结束今天，进入 Day N+1」**；数据 Tab 概览卡可点进问题明细与故事进度详情 |
| `/story/[storyCardId]` | 蜡染装裱故事卡 | 只渲染真实 story_event：听过的故事、观察题答案、来源清单 |

## 五、接入后端时的替换点

- `src/lib/demo.ts` 全部数据 → Drizzle 查询 / Server Actions；
- `TouristApp` 中 `onSend` 的演示规则层 → `/api/chat`（真实规则层 + 检索 + 流式）；
- 异常卡的 `setTimeout` 模拟确认 → SWR 2 秒轮询 `/api/status`；
- `src/lib/poi.ts` 的 `searchPoi`（内置贵州 POI 集）→ `/api/poi/search` 服务端代理高德 place/text（`AMAP_KEY` 仅服务端）；`planRoute` 估算 → `/api/poi/direction`；
- 集合点照片的 `URL.createObjectURL` 本地预览 → `uploadStagePhoto` 上传后写真 url；
- QRCode 的 `https://aqian.demo` → `NEXT_PUBLIC_APP_URL`。
