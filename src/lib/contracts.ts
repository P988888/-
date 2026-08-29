/**
 * 阿黔前端与应用共用的轻量 DTO。
 * 服务端与页面共用的轻量 DTO。
 * 展示层继续使用 demo.ts 的类型，避免后端字段名渗漏到组件里。
 */
import type { GuideAlert, Member, QuestionItem, TourDay } from "@/lib/demo";

export interface TourDTO {
  code: string;
  name: string;
  route: string;
  guideName: string;
  guidePhone: string;
  status: "draft" | "active" | "completed";
  totalDays: number;
  currentDay: number;
  routeKey: string | null;
  startsAt: string;
}

export type { GuideAlert, Member, QuestionItem, TourDay };

/** 知识卡（导游端「知识库」编辑页与游客问答共用的检索源） */
export interface KnowledgeCardDTO {
  id: string;
  routeKey: string | null;
  stageKey: string | null;
  category: "culture" | "facility" | "notice";
  title: string;
  contentZhShort: string;
  contentZhDeep: string;
  contentEnShort: string;
  contentEnDeep: string;
  keywords: string[];
  dontSay: string[];
  sourceTitle: string;
  sourceUrl: string | null;
  status: "draft" | "verified" | "expired";
}

export interface StoryCardDTO {
  id: string;
  title: string;
  owner: string;
  route: string;
  date: string;
  stories: { title: string; note: string; source: string }[];
  observation: { task: string; answer: string } | null;
  sources: string[];
}

export interface StatusDTO {
  serverTime: string;
  currentDay: number;
  days: TourDay[];
  alerts: GuideAlert[];
  members?: Member[];
  stats?: { questionCount: number; storyDone: number; memberTotal: number };
  /** 游客端故事卡闭环：当前线路的观察任务定义 */
  storyTask?: { id: string; title: string; brief: string; clues: string[] } | null;
  /** 该成员已生成的故事卡；按生成时间排列，支持跨景区逐段查看。 */
  storyCardId?: string;
  storyCardIds?: string[];
  /** 导游端「今日提问」明细（role=guide 时返回） */
  questions?: QuestionItem[];
}
