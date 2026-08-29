/**
 * Demo 团种子数据（阶段 0「冻结数据」的前端镜像）。
 * 后端接入后由 Server Actions / Drizzle 替换，此处保证页面可独立演示。
 */

export type MemberStatus =
  | "joined"
  | "checked_in"
  | "help_pending"
  | "help_acknowledged"
  | "completed";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Stage {
  /** 数据库节点主键；演示静态数据可省略 */
  id?: string;
  seq: number;
  name: string;
  meetingTime: string; // ISO
  point: string;
  pointHint: string;
  updatedAt: string; // 导游最后更新时间（显示用）
  isCurrent?: boolean;
  /** 高德 POI 定位（GCJ-02），导游创建行程时由搜索带入 */
  address?: string;
  location?: { lng: number; lat: number };
  /** 集合点照片：游客照着照片找位置 */
  photo?: string;
  /** 景区内按游览顺序设置的景点；从集合点步行依次到访。 */
  scenicStops?: ScenicStop[];
}

export interface ScenicStop {
  name: string;
  location?: { lng: number; lat: number };
  address?: string;
}

const now = Date.now();
const dayMs = 24 * 60 * 60_000;

export const demoTour = {
  code: "QY-1024",
  name: "黔行三日 · 数博会来宾团",
  route: "青岩 — 黄果树 — 黔灵山",
  guideName: "周导",
  guidePhone: "138 8521 2618",
  date: new Date(now).toISOString(),
  memberCount: 10,
  totalDays: 3,
  currentDay: 1,
};

/** 多日行程：团 → 天 → 当日节点。每天状态由 currentDay 推导：已结束/今天/未开始 */
export interface TourDay {
  day: number; // 1-based
  date: string; // ISO，当日日期
  title: string; // 当日主题，如「青岩古镇 · 石头城」
  stages: Stage[];
}

export type DayStatus = "done" | "current" | "upcoming";

export function dayStatus(day: number, currentDay: number): DayStatus {
  if (day < currentDay) return "done";
  if (day === currentDay) return "current";
  return "upcoming";
}

export const demoDays: TourDay[] = [
  {
    day: 1,
    date: new Date(now).toISOString(),
    title: "青岩古镇 · 石头城",
    stages: [
      {
        seq: 1,
        name: "北门城楼集合入城",
        meetingTime: new Date(now - 55 * 60_000).toISOString(),
        point: "青岩古镇北门城楼",
        pointHint: "城楼下的石狮子旁，举蓝色队旗",
        address: "贵州省贵阳市花溪区青岩古镇北街入口",
        location: { lng: 106.6872, lat: 26.3368 },
        photo: "/demo/qingyan-gate.svg",
        scenicStops: [
          { name: "慈云寺广场 · 石牌坊", address: "贵州省贵阳市花溪区青岩古镇慈云寺前", location: { lng: 106.6891, lat: 26.3349 } },
        ],
        updatedAt: new Date(now - 55 * 60_000).toISOString(),
      },
      {
        seq: 2,
        name: "背街石巷 · 自由探索",
        meetingTime: new Date(now + 37 * 60_000).toISOString(),
        point: "慈云寺广场 · 石牌坊下",
        pointHint: "广场东侧石牌坊，近状元蹄老店",
        address: "贵州省贵阳市花溪区青岩古镇慈云寺前",
        location: { lng: 106.6891, lat: 26.3349 },
        photo: "/demo/ciyun-square.svg",
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
        isCurrent: true,
      },
      {
        seq: 3,
        name: "返程集合",
        meetingTime: new Date(now + 125 * 60_000).toISOString(),
        point: "北门停车场 · 3 号车位",
        pointHint: "来时下车处，车牌贵 A·D30218",
        address: "贵州省贵阳市花溪区青岩古镇北门东侧",
        location: { lng: 106.6878, lat: 26.3381 },
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
      },
    ],
  },
  {
    day: 2,
    date: new Date(now + dayMs).toISOString(),
    title: "黄果树 · 大瀑布",
    stages: [
      {
        seq: 1,
        name: "酒店集合出发",
        meetingTime: new Date(now + dayMs - 3.5 * 60 * 60_000).toISOString(),
        point: "贵阳饭店大堂",
        pointHint: "行李直接上车，8:30 准时发车",
        address: "贵州省贵阳市云岩区中华北路 3 号",
        location: { lng: 106.7132, lat: 26.5786 },
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
      },
      {
        seq: 2,
        name: "大瀑布景区 · 自由游览",
        meetingTime: new Date(now + dayMs + 2.5 * 60 * 60_000).toISOString(),
        point: "观瀑台 · 水帘洞入口",
        pointHint: "雨衣在景区门口找周导领取",
        address: "黄果树大瀑布景区观瀑台",
        location: { lng: 105.6721, lat: 25.9802 },
        photo: "/demo/huangguoshu.svg",
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
      },
      {
        seq: 3,
        name: "返程贵阳",
        meetingTime: new Date(now + dayMs + 8 * 60 * 60_000).toISOString(),
        point: "景区停车场 · 3 号车位",
        pointHint: "原车原位，17:00 发车",
        address: "黄果树景区游客服务中心旁",
        location: { lng: 105.6745, lat: 25.9841 },
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
      },
    ],
  },
  {
    day: 3,
    date: new Date(now + 2 * dayMs).toISOString(),
    title: "黔灵山 · 送站",
    stages: [
      {
        seq: 1,
        name: "黔灵山公园",
        meetingTime: new Date(now + 2 * dayMs + 1 * 60 * 60_000).toISOString(),
        point: "弘福寺前广场",
        pointHint: "缆车站旁，看蓝色队旗",
        address: "贵州省贵阳市云岩区黔灵山公园弘福寺",
        location: { lng: 106.6968, lat: 26.6059 },
        photo: "/demo/qianling.svg",
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
      },
      {
        seq: 2,
        name: "送贵阳北站",
        meetingTime: new Date(now + 2 * dayMs + 5 * 60 * 60_000).toISOString(),
        point: "北站东进站口",
        pointHint: "预留 40 分钟进站，团到此解散",
        address: "贵州省贵阳市观山湖区贵阳北站",
        location: { lng: 106.6715, lat: 26.6197 },
        updatedAt: new Date(now - 12 * 60_000).toISOString(),
      },
    ],
  },
];

export interface ChatMessage {
  id: string;
  role: "aqian" | "me";
  text: string;
  /** 来源标注：文化/行程类回答必须带 */
  source?: string;
  intent?: "schedule" | "culture" | "facility";
}

export const demoMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "aqian",
    text: "你好呀，我是阿黔，正和周导一起服务咱们这个团。自由探索期间有事随时问我——集合信息、附近设施、这条石巷的故事，都可以。",
  },
  {
    id: "m2",
    role: "me",
    text: "我们几点集合？",
  },
  {
    id: "m3",
    role: "aqian",
    intent: "schedule",
    text: "请在 14:30 前回到慈云寺广场的石牌坊下集合。从背街走过去大约 6 分钟，建议 14:20 动身。",
    source: "来自本团行程 · 周导 12 分钟前更新",
  },
  {
    id: "m4",
    role: "me",
    text: "为什么青岩的房子都是石头砌的？",
  },
  {
    id: "m5",
    role: "aqian",
    intent: "culture",
    text: "青岩建于明洪武年间，原是军事屯堡。就地取用的青石板耐风化、能防火，石墙配上「马头墙」，既有江南营造的影子，也适应了贵州多雨的山地。你现在脚下的背街，石板路被六百年的脚步磨得发亮，正是「石头城」名字的由来。",
    source: "来源：《青岩镇志》· 周导已审核",
  },
];

export interface Member {
  id: string;
  nickname: string;
  language: "zh" | "en";
  interest: "nature" | "culture";
  status: MemberStatus;
  storyDone: boolean;
}

export const demoMembers: Member[] = [
  { id: "u1", nickname: "林先生", language: "zh", interest: "culture", status: "checked_in", storyDone: true },
  { id: "u2", nickname: "Sarah", language: "en", interest: "nature", status: "checked_in", storyDone: true },
  { id: "u3", nickname: "王阿姨", language: "zh", interest: "culture", status: "help_pending", storyDone: false },
  { id: "u4", nickname: "小陈", language: "zh", interest: "nature", status: "checked_in", storyDone: true },
  { id: "u5", nickname: "David", language: "en", interest: "culture", status: "joined", storyDone: false },
  { id: "u6", nickname: "小豆子一家", language: "zh", interest: "nature", status: "checked_in", storyDone: true },
];

export interface GuideAlert {
  id: string;
  memberNickname: string;
  type: "delay" | "lost" | "health" | "help";
  summary: string;
  landmark: string;
  createdAt: string;
  status: AlertStatus;
  guideResponse?: string;
}

export const demoAlerts: GuideAlert[] = [
  {
    id: "a1",
    memberNickname: "王阿姨",
    type: "delay",
    summary: "「腿有点累，可能会迟到十分钟」——阿黔已停止闲聊并转交您处理",
    landmark: "背街中段 · 石砌拱门附近",
    createdAt: new Date(now - 90 * 1000).toISOString(),
    status: "open",
  },
];

export const demoStoryCard = {
  id: "demo",
  title: "石头城的三个线索",
  owner: "林先生",
  route: "青岩古镇北线",
  date: new Date(now).toISOString(),
  stories: [
    {
      title: "背街：被脚步磨亮的石板路",
      note: "听完了 90 秒中文深度版",
      source: "《青岩镇志》",
    },
    {
      title: "马头墙：军事屯堡里的江南影子",
      note: "听完了 60 秒中文标准版",
      source: "贵州省博物馆 · 屯堡文化展陈资料",
    },
  ],
  observation: {
    task: "找到「石街、石墙、石城门」，拍下一处你最喜欢的",
    answer: "我选了石城门——定广门。门洞里的光落在石板上，像一条被时间磨亮的河。",
  },
  sources: ["《青岩镇志》", "贵州省博物馆 · 屯堡文化展陈资料", "周导现场核验（2026.05）"],
};

/** 导游端「今日提问」摘要明细 */
export interface QuestionItem {
  id: string;
  memberNickname: string;
  text: string;
  intent: "schedule" | "facility" | "culture" | "other";
  createdAt: string;
  /** 是否有来源（文化/设施/行程类应有） */
  sourceLabel?: string;
}

export const demoQuestions: QuestionItem[] = [
  { id: "q1", memberNickname: "林先生", text: "我们几点集合？", intent: "schedule", createdAt: new Date(now - 8 * 60_000).toISOString(), sourceLabel: "本团行程" },
  { id: "q2", memberNickname: "Sarah", text: "What time do we meet?", intent: "schedule", createdAt: new Date(now - 15 * 60_000).toISOString(), sourceLabel: "本团行程" },
  { id: "q3", memberNickname: "王阿姨", text: "附近有洗手间吗？", intent: "facility", createdAt: new Date(now - 22 * 60_000).toISOString(), sourceLabel: "青岩景区导览图" },
  { id: "q4", memberNickname: "小豆子一家", text: "为什么这里的房子都是石头做的？", intent: "culture", createdAt: new Date(now - 31 * 60_000).toISOString(), sourceLabel: "《青岩镇志》" },
  { id: "q5", memberNickname: "小陈", text: "集合点具体在广场哪一侧？", intent: "schedule", createdAt: new Date(now - 40 * 60_000).toISOString(), sourceLabel: "本团行程" },
  { id: "q6", memberNickname: "David", text: "Why is Qingyan called the stone town?", intent: "culture", createdAt: new Date(now - 52 * 60_000).toISOString(), sourceLabel: "《青岩镇志》" },
  { id: "q7", memberNickname: "林先生", text: "几点从北门返程？", intent: "schedule", createdAt: new Date(now - 65 * 60_000).toISOString(), sourceLabel: "本团行程" },
  { id: "q8", memberNickname: "小豆子一家", text: "背街最窄的地方在哪里？", intent: "culture", createdAt: new Date(now - 78 * 60_000).toISOString(), sourceLabel: "《青岩镇志》" },
  { id: "q9", memberNickname: "王阿姨", text: "有没有地方接热水？", intent: "facility", createdAt: new Date(now - 95 * 60_000).toISOString(), sourceLabel: "青岩景区导览图" },
  { id: "q10", memberNickname: "小陈", text: "附近有卖水的吗？", intent: "facility", createdAt: new Date(now - 110 * 60_000).toISOString(), sourceLabel: "青岩景区导览图" },
];

/** 布依蜡染互动任务定义（故事完成明细用） */
export const demoStoryTask = {
  title: "石头寨 · 布依蜡染观察任务",
  brief: "看看蜡染布上的花纹：它是直接画上去的，还是先用蜡封住、染色后留出来的？选择答案，再写下一句你记住的细节。",
  clues: ["观察蜡绘花纹", "找出染色后的留白", "写下一句记忆钩子"],
};

/** 创建旅行团可选的线路模板 */
export interface RouteTemplate {
  key: string;
  name: string;
  duration: string;
  stageNames: string[];
  available: boolean;
}

export const routeTemplates: RouteTemplate[] = [
  {
    key: "qingyan-north",
    name: "青岩古镇北线",
    duration: "约 90 分钟",
    stageNames: ["北门城楼集合入城", "背街石巷 · 自由探索", "返程集合"],
    available: true,
  },
  {
    key: "qingyan-south",
    name: "青岩古镇南线（模板待核验）",
    duration: "约 120 分钟",
    stageNames: ["定广门集合", "状元府", "返程集合"],
    available: false,
  },
];

/** 快捷提问的预置回答（模型断开时也可用，主链路不依赖模型） */
export const cannedAnswers: Record<string, ChatMessage> = {
  meeting: {
    id: "c-meeting",
    role: "aqian",
    intent: "schedule",
    text: "请在 14:30 前回到慈云寺广场的石牌坊下集合。从背街走过去大约 6 分钟，建议 14:20 动身。",
    source: "来自本团行程 · 周导 12 分钟前更新",
  },
  facility: {
    id: "c-facility",
    role: "aqian",
    intent: "facility",
    text: "离您最近的洗手间在慈云寺广场西侧，步行约 3 分钟，门口有蓝色指示牌。背街中段也有一处直饮水点。",
    source: "来源：青岩景区导览图 · 周导 5 月核验",
  },
  story: {
    id: "c-story",
    role: "aqian",
    intent: "culture",
    text: "您脚下的背街是青岩最有电影感的一条巷子——姜文《寻枪》曾在这里取景。两侧石墙随山势起伏，最窄处只容两人侧身。建议您抬头看看墙头的「马头墙」，那是屯堡人从江淮带来的营造记忆。",
    source: "来源：《青岩镇志》· 周导已审核",
  },
};
