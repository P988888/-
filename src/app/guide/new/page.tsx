"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Map,
  IdCard,
  KeyRound,
  PartyPopper,
  Check,
  CalendarDays,
  PenLine,
  Plus,
  Trash2,
  Minus,
  ImagePlus,
  X,
  Route,
  Sparkles,
  LoaderCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PoiInput } from "@/components/poi-input";
import { RouteMap } from "@/components/route-map";
import { ScenicStopsEditor } from "@/components/scenic-stops-editor";
import { planRoute, type Poi } from "@/lib/poi";
import type { ScenicStop } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { routeTemplates } from "@/lib/demo";
import { createTour } from "@/actions/tour-actions";

const steps = ["团信息", "线路方式", "每日行程", "导游口令", "完成"];

interface EditStage {
  time: string;
  name: string;
  point: string;
  /** 高德 POI 定位（搜索选中后带入） */
  address?: string;
  location?: { lng: number; lat: number };
  /** 集合点照片：上传或 POI 示例图 */
  photo?: string;
  /** 景区内部按步行顺序游览的景点 */
  scenicStops?: ScenicStop[];
}
interface EditDay {
  title: string;
  stages: EditStage[];
}

/** 模板预填（青岩北线 = 1 天，含 POI 定位与示例照片） */
const templateDays: EditDay[] = [
  {
    title: "青岩古镇 · 石头城",
    stages: [
      {
        time: "09:00",
        name: "北门城楼集合入城",
        point: "青岩古镇北门城楼",
        address: "贵州省贵阳市花溪区青岩古镇北街入口",
        location: { lng: 106.6872, lat: 26.3368 },
        photo: "/demo/qingyan-gate.svg",
        scenicStops: [
          { name: "慈云寺广场 · 石牌坊", address: "贵州省贵阳市花溪区青岩古镇慈云寺前", location: { lng: 106.6891, lat: 26.3349 } },
        ],
      },
      {
        time: "14:30",
        name: "背街石巷 · 自由探索",
        point: "慈云寺广场 · 石牌坊下",
        address: "贵州省贵阳市花溪区青岩古镇慈云寺前",
        location: { lng: 106.6891, lat: 26.3349 },
        photo: "/demo/ciyun-square.svg",
      },
      {
        time: "16:00",
        name: "返程集合",
        point: "北门停车场 · 3 号车位",
        address: "贵州省贵阳市花溪区青岩古镇北门东侧",
        location: { lng: 106.6878, lat: 26.3381 },
      },
    ],
  },
];

function emptyDays(n: number): EditDay[] {
  // 自定义行程：每天从 0 个游览节点开始，由导游逐个添加真实景点。
  // 不要再预置一个空 point 的占位节点，否则导游新增的景点会被追加成新节点，
  // 留下占位节点空转，导致一直提示「第 1 个游览节点还缺少地点」。
  return Array.from({ length: n }, () => ({
    title: "",
    stages: [],
  }));
}

function todayStr() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

function addDays(dateStr: string, i: number) {
  const d = new Date(dateStr + "T00:00:00+08:00");
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  });
}

function isDayComplete(day: EditDay) {
  return day.title.trim().length > 0 && day.stages.length > 0 && day.stages.every((stage) => stage.point.trim());
}

function dayMissingHint(day: EditDay, dayIndex: number) {
  if (!day.title.trim()) return `Day ${dayIndex + 1} 还没有填写当日主题`;
  if (day.stages.length === 0) return `Day ${dayIndex + 1} 还没有游览节点，请点下方「加一个游览节点」，或先「按主题生成本日行程骨架」`;
  const stageIndex = day.stages.findIndex((stage) => !stage.point.trim());
  return stageIndex < 0
    ? `请检查 Day ${dayIndex + 1} 的行程节点`
    : `Day ${dayIndex + 1} 的第 ${stageIndex + 1} 个游览节点还缺少地点`;
}

/** 创建旅行团：团信息与天数 → 模板或自定义 → 逐天编辑行程 → 口令 → 二维码 */
export default function NewTourPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // 第 1 步：团信息
  const [name, setName] = useState("");
  const [guideName, setGuideName] = useState("");
  const [guidePhone, setGuidePhone] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [dayCount, setDayCount] = useState(3);

  // 第 2 步：线路方式
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [templateKey, setTemplateKey] = useState("qingyan-north");

  // 第 3 步：每日行程
  const [days, setDays] = useState<EditDay[]>(templateDays);
  const [activeDay, setActiveDay] = useState(0);

  // 第 4 步：口令
  const [pin, setPin] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [itineraryError, setItineraryError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [aiPlanning, setAiPlanning] = useState(false);
  const [aiPlanError, setAiPlanError] = useState("");
  const [aiPlanSuccess, setAiPlanSuccess] = useState("");
  const [suggestions, setSuggestions] = useState<Poi[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  /** 本日被「AI 补全」定位到的节点下标，用来给导游标注哪些是 AI 猜的、哪些是自己锁的 */
  const [aiMarked, setAiMarked] = useState<number[]>([]);
  const [generatingSkeleton, setGeneratingSkeleton] = useState(false);

  const firstIncompleteDay = days.findIndex((day) => !isDayComplete(day));
  const itineraryValid = firstIncompleteDay === -1;
  /** 当日已有节点或地点时，不用「生成本日行程骨架」覆盖，改用「自动填充空白地点」 */
  const hasDayContent = days[activeDay].stages.some((s) => s.point.trim() || s.location);

  const canNext =
    (step === 0 && name.trim().length >= 2 && guideName.trim().length >= 1 && /^1[3-9]\d{9}$/.test(guidePhone) && !!startDate) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && /^\d{4,6}$/.test(pin)) ||
    step === 4;

  /** 下一步不可点时，明确告诉导游缺什么（不静默禁用按钮）。 */
  function stepMissingHint(): string {
    if (step === 0) {
      const missing: string[] = [];
      if (name.trim().length < 2) missing.push("团名称（至少 2 字）");
      if (guideName.trim().length < 1) missing.push("导游姓名");
      if (!/^1[3-9]\d{9}$/.test(guidePhone)) missing.push("导游手机号（11 位）");
      if (!startDate) missing.push("出团日期");
      return `请先补全：${missing.join("、")}`;
    }
    if (step === 3) return "请设置 4—6 位数字导游口令";
    return "";
  }

  async function goNext() {
    if (!canNext) {
      setCreateError(stepMissingHint());
      return;
    }
    setCreateError("");
    if (step === 1) {
      // 进入行程编辑前，按所选方式准备天数
      setDays(
        mode === "template"
          ? templateDays.map((d) => ({ ...d, stages: d.stages.map((s) => ({ ...s })) }))
          : emptyDays(dayCount)
      );
      setActiveDay(0);
    }
    if (step === 3) {
      setCreating(true); setCreateError("");
      const result = await createTour({
        name, guideName, guidePhone, startDate, mode, routeKey: mode === "template" ? templateKey : undefined,
        guidePin: pin,
        days: days.map((day) => ({ title: day.title, stages: day.stages.map((stage) => ({
          time: stage.time, name: stage.name || stage.point, point: stage.point,
          address: stage.address, location: stage.location, photo: stage.photo, scenicStops: stage.scenicStops,
        })) })),
      });
      setCreating(false);
      if (!result.ok) return setCreateError(result.error);
      setNewCode(result.tourCode); setStep(4); return;
    }
    if (step === 2 && !itineraryValid) {
      setActiveDay(firstIncompleteDay);
      setItineraryError(dayMissingHint(days[firstIncompleteDay], firstIncompleteDay));
      return;
    }
    setStep(step + 1);
  }

  function updateDay(fn: (d: EditDay) => EditDay) {
    setItineraryError("");
    setDays((ds) => ds.map((d, i) => (i === activeDay ? fn(d) : d)));
  }

  function switchDay(i: number) {
    setActiveDay(i);
    setItineraryError("");
    setSuggestions(null);
    setSuggestError("");
    setAiMarked([]);
    setAiPlanError("");
    setAiPlanSuccess("");
  }

  function clearAiMark(i: number) {
    setAiMarked((m) => m.filter((x) => x !== i));
  }

  /** 把上一个节点的「地点/地址/坐标/照片」复制到当前节点，简化同一景区内重复录入。 */
  function copyLocationFrom(si: number) {
    updateDay((d) => {
      const prev = d.stages[si - 1];
      if (!prev) return d;
      return {
        ...d,
        stages: d.stages.map((s, xi) => (xi === si ? {
          ...s,
          point: prev.point,
          address: prev.address,
          location: prev.location,
          photo: s.photo ?? prev.photo,
        } : s)),
      };
    });
    clearAiMark(si);
  }

  /** 按当日主题推荐一批可快速添加的景点（高德真实 POI，含坐标）。 */
  async function recommendDayPois() {
    const day = days[activeDay];
    if (!day.title.trim()) {
      setSuggestError("请先填写当日主题，例如“黄果树大瀑布游览”");
      return;
    }
    setSuggesting(true);
    setSuggestError("");
    setSuggestions(null);
    try {
      const response = await fetch("/api/itinerary/ai-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayTitle: day.title, mode: "suggest" }),
      });
      const result = (await response.json()) as { suggestions?: Poi[]; error?: string };
      if (!response.ok || !result.suggestions?.length) throw new Error(result.error ?? "没有找到可推荐的景点");
      setSuggestions(result.suggestions.slice(0, 8));
    } catch (error) {
      setSuggestError(error instanceof Error ? error.message : "推荐景点暂时不可用，请稍后重试");
    } finally {
      setSuggesting(false);
    }
  }

  function addSuggestion(sug: Poi) {
    updateDay((d) => ({
      ...d,
      stages: [...d.stages, { time: "", name: "", point: sug.name, address: sug.address, location: sug.location }],
    }));
  }

  /** 只填当日主题，让 AI 给出整天的行程骨架（节点 + 时间 + 高德真实点位），导游再微调。 */
  async function generateDaySkeleton() {
    const dayIndex = activeDay;
    const day = days[dayIndex];
    if (!day.title.trim()) {
      setAiPlanError("请先填写当日主题，例如“黄果树大瀑布游览”");
      return;
    }
    setGeneratingSkeleton(true);
    setAiPlanError("");
    setAiPlanSuccess("");
    setSuggestions(null);
    try {
      const response = await fetch("/api/itinerary/ai-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "skeleton", dayTitle: day.title }),
      });
      const result = (await response.json()) as { stages?: EditStage[]; error?: string };
      if (!response.ok || !result.stages?.length) throw new Error(result.error ?? "未能生成当日行程");
      setDays((current) => current.map((item, index) => index !== dayIndex ? item : {
        ...item,
        stages: result.stages!.map((stage) => ({ ...stage })),
      }));
      setAiMarked(result.stages.map((_, i) => i));
      setAiPlanSuccess(`已按「${day.title}」生成 ${result.stages.length} 个节点的行程骨架，可继续微调节点后进入下一步。`);
    } catch (error) {
      setAiPlanError(error instanceof Error ? error.message : "生成当日行程暂时不可用，请稍后重试");
    } finally {
      setGeneratingSkeleton(false);
    }
  }

  async function autoFillDayPois() {
    const dayIndex = activeDay;
    const day = days[dayIndex];
    if (!day.title.trim()) {
      setAiPlanError("请先填写当日主题，例如“黄果树大瀑布游览”");
      return;
    }
    if (day.stages.length === 0) {
      setAiPlanError("还没有游览节点，请先「加一个游览节点」或「按主题生成本日行程骨架」；「自动填充空白地点」用于补齐已有节点里空着的地点");
      return;
    }
    setAiPlanning(true);
    setAiPlanError("");
    setAiPlanSuccess("");
    try {
      const response = await fetch("/api/itinerary/ai-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "fill",
          dayTitle: day.title,
          anchors: day.stages.map((stage) => ({ time: stage.time, name: stage.name, point: stage.point, address: stage.address, location: stage.location })),
        }),
      });
      const result = (await response.json()) as { stages?: EditStage[]; holes?: number[]; source?: string; error?: string };
      if (!response.ok || !result.stages || result.stages.length !== day.stages.length) throw new Error(result.error ?? "智能规划没有返回完整结果");

      // 只把「本来没定位、这次被补上」的节点标成 AI 补全，手动锁定的不动。
      const filledIdx: number[] = [];
      result.stages.forEach((filled, stageIndex) => {
        if (filled.location && !day.stages[stageIndex]?.location) filledIdx.push(stageIndex);
      });
      const holes = result.holes ?? [];

      setDays((current) => current.map((item, index) => index !== dayIndex ? item : {
        ...item,
        stages: item.stages.map((stage, stageIndex) => ({ ...stage, ...result.stages![stageIndex], photo: stage.photo, scenicStops: stage.scenicStops })),
      }));
      setAiMarked(filledIdx);

      if (holes.length) {
        const names = holes.map((hi) => day.stages[hi]?.name || day.stages[hi]?.point || `第 ${hi + 1} 个节点`).join("、");
        setAiPlanError(`${holes.length} 个节点高德暂时没定位到：${names}。请在这几个节点手动选一下地点，或改用「景区名 + 景点名」搜索。`);
        setAiPlanSuccess(filledIdx.length ? `已自动定位 ${filledIdx.length} 个节点。` : "");
      } else {
        setAiPlanSuccess(`已按高德真实景点定位 ${filledIdx.length} 个节点，可继续微调后进入下一步。`);
      }
    } catch (error) {
      setAiPlanError(error instanceof Error ? error.message : "智能规划暂时不可用，请稍后重试");
    } finally {
      setAiPlanning(false);
    }
  }

  async function uploadStagePhoto(file: File, dayIndex: number, stageIndex: number) {
    const photoKey = `${dayIndex}-${stageIndex}`;
    setPhotoError("");
    setUploadingPhoto(photoKey);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/upload/meeting-photo", { method: "POST", body: data });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "图片上传失败，请重试");
      setDays((current) =>
        current.map((day, currentDayIndex) =>
          currentDayIndex === dayIndex
            ? {
                ...day,
                stages: day.stages.map((stage, currentStageIndex) =>
                  currentStageIndex === stageIndex ? { ...stage, photo: result.url } : stage
                ),
              }
            : day
        )
      );
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "图片上传失败，请重试");
    } finally {
      setUploadingPhoto((current) => (current === photoKey ? null : current));
    }
  }

  // 路线规划：按每天的 POI 定位自动生成分段车程
  const routeNodes = days.map((d, i) => {
    const located = d.stages.find((s) => s.location);
    return {
      day: i + 1,
      label: d.title || `Day ${i + 1}`,
      location: located?.location,
    };
  });
  const routeLegs = planRoute(
    days.map((d, i) => ({
      day: i + 1,
      title: d.title,
      first: { point: d.stages[0]?.point ?? "", location: d.stages[0]?.location },
      last: {
        point: d.stages[d.stages.length - 1]?.point ?? "",
        location: d.stages[d.stages.length - 1]?.location,
      },
    }))
  );
  const routePoints = days.flatMap((day) =>
    day.stages.flatMap((stage) => (stage.location ? [stage.location] : []))
  );

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        {step < 4 ? (
          <button
            type="button"
            aria-label="上一步"
            onClick={() => (step === 0 ? router.push("/guide") : setStep(step - 1))}
            className="flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-qian-50"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">创建旅行团</p>
          <p className="text-xs text-ink-faint">
            {steps[step]} · 第 {Math.min(step + 1, 4)} 步，共 4 步
          </p>
        </div>
      </header>

      {step < 4 && (
        <div className="mx-5 mt-1 flex gap-1.5">
          {steps.slice(0, 4).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-qian-600" : "bg-qian-100"
              )}
            />
          ))}
        </div>
      )}

      <main className="flex flex-1 flex-col px-6 py-6">
        {/* ——— 第 1 步：团信息 ——— */}
        {step === 0 && (
          <section className="space-y-5">
            <StepTitle icon={IdCard} title="团的基本信息" />
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">团名</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：数博会来宾 · 黔行三日团"
                className="h-13"
                maxLength={20}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">怎么称呼你</label>
              <Input
                value={guideName}
                onChange={(e) => setGuideName(e.target.value)}
                placeholder="如：周导"
                className="h-13"
                maxLength={8}
              />
              <p className="text-xs text-ink-faint">
                游客端会显示「阿黔正与{guideName || "×导"}共同服务本团」
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">联系电话</label>
              <Input
                type="tel"
                inputMode="tel"
                value={guidePhone}
                onChange={(e) => setGuidePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="用于游客端联系导游，如：13800138000"
                className="h-13"
                maxLength={11}
              />
              {guidePhone.length > 0 && !/^1[3-9]\d{9}$/.test(guidePhone) ? (
                <p className="text-xs text-cinnabar-600">请输入 11 位中国大陆手机号码</p>
              ) : (
                <p className="text-xs text-ink-faint">游客可在「我的」中查看并一键拨打；紧急求助也会同步使用此号码。</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-soft">出发日期</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-13"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-soft">行程天数</label>
                <div className="flex h-13 items-center justify-between rounded-2xl border border-qian-200 bg-card px-2 shadow-card">
                  <button
                    type="button"
                    aria-label="减少一天"
                    onClick={() => setDayCount((c) => Math.max(1, c - 1))}
                    className="flex size-9 items-center justify-center rounded-xl text-qian-600 hover:bg-qian-50"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="font-display text-lg font-bold text-qian-800">
                    {dayCount} 天
                  </span>
                  <button
                    type="button"
                    aria-label="增加一天"
                    onClick={() => setDayCount((c) => Math.min(10, c + 1))}
                    className="flex size-9 items-center justify-center rounded-xl text-qian-600 hover:bg-qian-50"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-faint">
              {dayCount === 1
                ? "单日团：当天行程实时同步给游客。"
                : `${dayCount} 天 ${dayCount - 1} 晚：每天的行程按日期自动同步给游客，当天结束后自动切换到下一天。`}
            </p>
          </section>
        )}

        {/* ——— 第 2 步：线路方式 ——— */}
        {step === 1 && (
          <section className="space-y-4">
            <StepTitle icon={Map} title="行程从哪里来？" />
            <div className="grid grid-cols-2 gap-3">
              <ChoiceCard
                active={mode === "template"}
                onClick={() => setMode("template")}
                icon={<Map className="size-5" />}
                title="用模板线路"
                desc="自带核验内容与知识卡"
              />
              <ChoiceCard
                active={mode === "custom"}
                onClick={() => setMode("custom")}
                icon={<PenLine className="size-5" />}
                title="自己写行程"
                desc={`自定义 ${dayCount} 天逐日安排`}
              />
            </div>

            {mode === "template" ? (
              <div className="space-y-3">
                {routeTemplates.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    disabled={!t.available}
                    onClick={() => setTemplateKey(t.key)}
                    className={cn(
                      "w-full rounded-3xl border p-4 text-left shadow-card transition-all active:scale-[0.98]",
                      templateKey === t.key
                        ? "border-qian-600 bg-qian-50"
                        : "border-qian-100/80 bg-card",
                      !t.available && "opacity-45"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-display text-[15px] font-semibold">{t.name}</p>
                      {templateKey === t.key && t.available && (
                        <span className="flex size-6 items-center justify-center rounded-full bg-qian-700 text-white">
                          <Check className="size-4" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">{t.duration} · 1 天</p>
                    <ol className="mt-2.5 space-y-1">
                      {t.stageNames.map((s, i) => (
                        <li key={s} className="flex items-center gap-2 text-[13px] text-ink-soft">
                          <span className="flex size-4.5 items-center justify-center rounded-full bg-qian-100 text-[10px] font-semibold text-qian-700">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                    {!t.available && (
                      <p className="mt-2 text-[11px] text-ink-faint">内容待导游现场核验后开放</p>
                    )}
                  </button>
                ))}
                <p className="text-xs leading-relaxed text-ink-faint">
                  模板是 1 天行程；多日团请选「自己写行程」，下一步可逐天编辑，也可在模板基础上改。
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-qian-100/80 bg-card p-4 shadow-card">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="size-5 text-qian-600" />
                  <p className="text-sm font-semibold">
                    {dayCount} 天 {dayCount - 1} 晚 · {addDays(startDate, 0)} 出发
                  </p>
                </div>
                <ol className="mt-3 space-y-1.5">
                  {Array.from({ length: dayCount }, (_, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-ink-soft">
                      <span className="flex size-4.5 items-center justify-center rounded-full bg-qian-100 text-[10px] font-semibold text-qian-700">
                        {i + 1}
                      </span>
                      {addDays(startDate, i)} · 待你填写当日安排
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
                  下一步逐天填写：当日主题与当天要去的一个个景点（节点）。集合时间创建后可再设，这里不用填。
                </p>
              </div>
            )}
          </section>
        )}

        {/* ——— 第 3 步：每日行程编辑 ——— */}
        {step === 2 && (
          <section className="space-y-4">
            <StepTitle icon={CalendarDays} title="逐天安排行程" />

            {/* 天切换 */}
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
              {days.map((_, i) => (
                (() => {
                  const complete = isDayComplete(days[i]);
                  return (
                <button
                  key={i}
                  type="button"
                  onClick={() => switchDay(i)}
                  className={cn(
                    "shrink-0 rounded-2xl border px-3.5 py-2 text-left transition-all active:scale-95",
                    activeDay === i
                      ? "border-qian-700 bg-qian-700 text-white shadow-card"
                      : !complete
                        ? "border-cinnabar-200 bg-cinnabar-50/50 text-cinnabar-700"
                      : "border-qian-100/80 bg-card text-ink-soft"
                  )}
                >
                  <span className="block text-[10px] opacity-80">Day {i + 1}</span>
                  <span className="block text-xs font-bold">{addDays(startDate, i)}</span>
                  {!complete && <span className="mt-0.5 block text-[9px] font-medium opacity-80">待补全</span>}
                </button>
                  );
                })()
              ))}
            </div>

            {itineraryError && (
              <p role="alert" className="rounded-xl bg-cinnabar-50 px-3 py-2 text-xs text-cinnabar-700">
                {itineraryError}
              </p>
            )}

            {/* 当日主题 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-soft">
                Day {activeDay + 1} 主题
              </label>
              <Input
                value={days[activeDay].title}
                onChange={(e) =>
                  updateDay((d) => ({ ...d, title: e.target.value }))
                }
                placeholder={`如：${activeDay === 0 ? "青岩古镇 · 石头城" : activeDay === 1 ? "黄果树 · 大瀑布" : "黔灵山 · 送站"}`}
                className="h-12"
              />
            </div>

            <div className="rounded-2xl border border-pine-500/25 bg-pine-100/35 p-3.5">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-pine-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-pine-800">阿黔智能助手</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-pine-700/85">
                    只填当日主题即可「一键生成整天行程骨架」；或直接添加景区的景点，再「自动填充空白地点」。点位全部来自高德真实 POI，已手动定位不会被覆盖。
                  </p>
                </div>
              </div>
              <Button size="sm" variant="pine" className="mt-3 w-full" disabled={aiPlanning || suggesting || generatingSkeleton || hasDayContent} onClick={() => void generateDaySkeleton()}>
                <CalendarDays className="size-4" /> {generatingSkeleton ? "正在生成…" : "按主题生成本日行程骨架"}
              </Button>
              {hasDayContent && !generatingSkeleton && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                  当天已有节点或地点，为避免覆盖你的手动内容，请用下方的「自动填充空白地点」。
                </p>
              )}
              <Button size="sm" variant="pine" className="mt-2 w-full" disabled={aiPlanning || generatingSkeleton} onClick={() => void autoFillDayPois()}>
                {aiPlanning ? <><LoaderCircle className="size-4 animate-spin" /> 正在检索与规划…</> : <><Sparkles className="size-4" /> 自动填充空白地点</>}
              </Button>
              <Button size="sm" variant="outline" className="mt-2 w-full" disabled={suggesting || generatingSkeleton} onClick={() => void recommendDayPois()}>
                <Route className="size-4" /> {suggesting ? "正在检索…" : "按主题推荐景点，快速添加"}
              </Button>
              {aiPlanError && <p role="alert" className="mt-2 text-[11px] leading-relaxed text-cinnabar-700">{aiPlanError}</p>}
              {aiPlanSuccess && <p className="mt-2 text-[11px] leading-relaxed text-pine-700">{aiPlanSuccess}</p>}
              {suggestError && <p role="alert" className="mt-2 text-[11px] leading-relaxed text-cinnabar-700">{suggestError}</p>}
              {suggestions && suggestions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-medium text-pine-800">点「+」把推荐景点加为节点</p>
                  <ul className="space-y-1.5">
                    {suggestions.map((sug) => (
                      <li key={sug.id} className="flex items-center gap-2 rounded-xl bg-card px-2.5 py-2">
                        <Map className="size-4 shrink-0 text-qian-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-ink">{sug.name}</span>
                          <span className="block truncate text-[10px] text-ink-faint">{sug.address}</span>
                        </span>
                        <button
                          type="button"
                          aria-label={`添加 ${sug.name}`}
                          onClick={() => addSuggestion(sug)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-qian-700 text-white transition active:scale-95"
                        >
                          <Plus className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 当日节点 */}
            <div className="space-y-2.5">
              <label className="text-sm font-medium text-ink-soft">
                当日游览节点（{days[activeDay].stages.length} 个）
              </label>
              {days[activeDay].stages.length === 0 && (
                <p className="rounded-xl border border-dashed border-qian-200 bg-paper px-3.5 py-3 text-xs leading-relaxed text-ink-faint">
                  这一天还没有游览节点。点下方「加一个游览节点」逐个添加景点，或先「按主题生成本日行程骨架」让阿黔生成。
                </p>
              )}
              {days[activeDay].stages.map((s, si) => (
                <div
                  key={si}
                  className="rounded-2xl border border-qian-100/80 bg-card p-3 shadow-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-qian-700 text-[11px] font-semibold text-white">
                        {si + 1}
                      </span>
                      <label className="text-xs font-medium text-ink-soft">到哪个景点</label>
                    </span>
                    <button
                      type="button"
                      aria-label="删除该景点"
                      disabled={days[activeDay].stages.length <= 1}
                      onClick={() =>
                        updateDay((d) => ({
                          ...d,
                          stages: d.stages.filter((_, xi) => xi !== si),
                        }))
                      }
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-cinnabar-50 hover:text-cinnabar-600 disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {/* 行程地点：高德 POI 搜索定位 */}
                  <div className="mt-2">
                    <PoiInput
                      value={s.point}
                      onChangeText={(text) => {
                        clearAiMark(si);
                        updateDay((d) => ({
                          ...d,
                          stages: d.stages.map((x, xi) =>
                            xi === si
                              ? { ...x, point: text, address: undefined, location: undefined }
                              : x
                          ),
                        }));
                      }}
                      onSelect={(poi: Poi) => {
                        clearAiMark(si);
                        updateDay((d) => ({
                          ...d,
                          stages: d.stages.map((x, xi) =>
                            xi === si
                              ? {
                                  ...x,
                                  point: poi.name,
                                  address: poi.address,
                                  location: poi.location,
                                  photo: x.photo ?? poi.photo,
                                }
                              : x
                          ),
                        }));
                      }}
                      placeholder="搜索游览地点，如：黄果树大瀑布"
                    />
                    {s.address && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-moss-600">
                        <Check className="size-3.5" />
                        已定位：{s.address}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      {si > 0 && (
                        <button
                          type="button"
                          onClick={() => copyLocationFrom(si)}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-qian-200 bg-card px-2.5 text-[11px] font-medium text-qian-600 transition active:scale-[0.98] hover:bg-qian-50"
                        >
                          <Plus className="size-3" /> 复用上一节点地点
                        </button>
                      )}
                      {aiMarked.includes(si) && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-pine-700">
                          <Sparkles className="size-3.5" /> AI 已补全地点，可改可换
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <ScenicStopsEditor
                      stops={s.scenicStops ?? []}
                      onChange={(scenicStops) =>
                        updateDay((d) => ({
                          ...d,
                          stages: d.stages.map((x, xi) => xi === si ? { ...x, scenicStops } : x),
                        }))
                      }
                    />
                  </div>

                  {/* 节点照片：游客照着照片找位置 */}
                  <div className="mt-2 flex items-center gap-2.5">
                    {s.photo ? (
                      <div className="relative shrink-0">
                        <img
                          src={s.photo}
                          alt="集合点照片预览"
                          className="h-16 w-24 rounded-xl border border-qian-100 object-cover"
                        />
                        <button
                          type="button"
                          aria-label="移除照片"
                          onClick={() =>
                            updateDay((d) => ({
                              ...d,
                              stages: d.stages.map((x, xi) =>
                                xi === si ? { ...x, photo: undefined } : x
                              ),
                            }))
                          }
                          className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-card shadow-card"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className={cn(
                          "flex h-16 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-qian-300 bg-qian-50/60 text-qian-600 transition hover:bg-qian-50",
                          uploadingPhoto === `${activeDay}-${si}` && "cursor-wait opacity-60"
                        )}
                      >
                        <ImagePlus className="size-4.5" />
                        <span className="text-[10px]">
                          {uploadingPhoto === `${activeDay}-${si}` ? "上传中…" : "添加照片"}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={uploadingPhoto === `${activeDay}-${si}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            void uploadStagePhoto(file, activeDay, si);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    )}
                    <p className="text-[11px] leading-relaxed text-ink-faint">
                      {s.photo
                        ? "游客端集合卡将显示这张照片，照着照片找位置"
                        : "拍一张集合点照片（或选 POI 自带示例图），游客照着照片找位置"}
                    </p>
                  </div>
                  {photoError && (
                    <p role="alert" className="mt-2 text-[11px] text-cinnabar-700">
                      图片没有保存成功：{photoError}
                    </p>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="w-full border-dashed"
                onClick={() =>
                  updateDay((d) => ({
                    ...d,
                    stages: [...d.stages, { time: "", name: "", point: "" }],
                  }))
                }
              >
                <Plus className="size-4" />
                加一个游览节点
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-faint">
              创建后不用填集合时间——系统会按景点顺序给一版默认时间，你随时可在驾驶舱「行程」里改成真实时间。
              每天行程按日期自动同步给游客；当天在驾驶舱点「结束今天」，游客端自动标记这一天已结束并切到下一天。
            </p>
          </section>
        )}

        {/* ——— 第 4 步：口令 ——— */}
        {step === 3 && (
          <section className="space-y-5">
            <StepTitle icon={KeyRound} title="设一个导游口令" />
            <p className="text-sm leading-relaxed text-ink-soft">
              4—6 位数字，只有你知道。进入驾驶舱、改行程、处理异常都需要它；
              游客端永远看不到。
            </p>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="如：123456"
              className="h-14 text-center font-mono text-xl tracking-[0.4em]"
              maxLength={6}
              autoFocus
            />
            {pin.length > 0 && !/^\d{4,6}$/.test(pin) && (
              <p className="text-xs text-cinnabar-600">口令需要 4—6 位数字</p>
            )}
          </section>
        )}

        {/* ——— 完成 ——— */}
        {step === 4 && (
          <section className="flex flex-1 flex-col items-center gap-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-moss-100 text-moss-600">
              <PartyPopper className="size-8" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold">团建好了</h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                {name} · {days.length} 天{days.length > 1 ? ` ${days.length - 1} 晚` : ""}行程 ·{" "}
                {days.reduce((n, d) => n + d.stages.length, 0)} 个游览节点
              </p>
            </div>

            {/* 自动生成的路线规划 */}
            <div className="w-full rounded-3xl border border-qian-100/80 bg-card p-4 text-left shadow-card">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-qian-800">
                <Route className="size-4" />
                路线规划已自动生成
              </h2>
              <RouteMap nodes={routeNodes} legs={routeLegs} tourCode={newCode} routePoints={routePoints} />
              <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
                按各游览节点的高德定位生成，已同步到游客端行程页
              </p>
            </div>

            <div className="rounded-3xl bg-card p-4 shadow-card ring-1 ring-qian-100">
              <QRCodeSVG
                value={`https://aqian.demo/join?code=${newCode}`}
                size={172}
                fgColor="#1f4a5e"
                bgColor="#fffdf6"
                level="M"
              />
            </div>
            <p className="text-sm">
              团码{" "}
              <span className="font-mono text-lg font-bold text-qian-700">{newCode}</span>
            </p>
            <p className="max-w-[280px] text-xs leading-relaxed text-ink-faint">
              把二维码发到微信群，游客扫码 3 步进团；Day 1 行程即刻同步，
              之后每天在驾驶舱「结束今天」即可切换到下一天。
            </p>
          </section>
        )}
      </main>

      <footer className="space-y-2.5 px-6 pb-10">
        {createError && <p role="alert" className="rounded-xl bg-cinnabar-50 px-3 py-2 text-center text-xs text-cinnabar-700">{createError}</p>}
        {step < 4 ? (
          <Button size="xl" className="w-full" disabled={creating} onClick={() => void goNext()}>
            {creating ? "正在创建…" : step === 3 ? "创建旅行团" : step === 2 && !itineraryValid ? `去完善 Day ${firstIncompleteDay + 1}` : "下一步"}
          </Button>
        ) : (
          <>
            <Button
              size="xl"
              className="w-full"
              onClick={() => router.push(`/guide/${newCode}`)}
            >
              进入本团驾驶舱
            </Button>
            <Link href="/guide" className="block">
              <Button variant="ghost" size="lg" className="w-full">
                返回导游入口
              </Button>
            </Link>
          </>
        )}
      </footer>
    </AppShell>
  );
}

function StepTitle({ icon: Icon, title }: { icon: typeof Map; title: string }) {
  return (
    <div className="flex items-center gap-2 text-qian-700">
      <Icon className="size-5" />
      <h1 className="font-display text-xl font-semibold">{title}</h1>
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-3xl border p-3 text-center transition-all active:scale-[0.97]",
        active
          ? "border-qian-600 bg-qian-700 text-white shadow-card"
          : "border-qian-200 bg-card text-ink-soft shadow-card"
      )}
    >
      {icon}
      <span className={cn("text-sm font-semibold", active ? "text-white" : "text-ink")}>
        {title}
      </span>
      <span className={cn("text-[11px]", active ? "text-qian-100" : "text-ink-faint")}>
        {desc}
      </span>
    </button>
  );
}
