/**
 * Demo 团种子（阶段 0「冻结数据」）—— 与前端 src/lib/demo.ts 完全一致，
 * 保证接后端后 QY-1024 的演示表现与纯前端态一字不差。
 * resetDemoTour 复用 seedDemoTour(force=true) 实现「一键恢复初始团」。
 */
import "server-only";
import { sqlite } from "./index";
import { hashPin, hashToken } from "@/lib/auth/crypto";

const DEMO_CODE = "QY-1024";
const DEMO_PIN = "2468"; // 与 DESIGN.md 演示口令一致
const dayMs = 24 * 60 * 60_000;

/** 演示成员的稳定 token（现场可用固定链接进入，不必真的扫码） */
export const DEMO_MEMBER_TOKENS: Record<string, string> = {
  u1: "demo-token-u1",
};

export function seedDemoTour(force = false): { code: string } {
  const exists = sqlite
    .prepare("SELECT code FROM tours WHERE code = ?")
    .get(DEMO_CODE);
  if (exists && !force) return { code: DEMO_CODE };

  const tx = sqlite.transaction(() => {
    // 幂等：先清掉本团所有数据（限本团作用域，不动其他团）
    for (const t of [
      "story_cards",
      "story_events",
      "alerts",
      "messages",
      "members",
      "tour_stages",
      "tour_days",
    ]) {
      sqlite.prepare(`DELETE FROM ${t} WHERE tour_code = ?`).run(DEMO_CODE);
    }
    sqlite.prepare("DELETE FROM tours WHERE code = ?").run(DEMO_CODE);
    // story_tasks 与 knowledge_cards 都按「团」管理，重置时一并刷新
    sqlite.prepare("DELETE FROM story_tasks WHERE tour_code = ?").run(DEMO_CODE);
    sqlite.prepare("DELETE FROM knowledge_cards WHERE tour_code = ?").run(DEMO_CODE);

    const now = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();

    sqlite
      .prepare(
        `INSERT INTO tours (code,name,route,guide_name,guide_phone,guide_pin_hash,status,total_days,current_day,route_key,starts_at,created_at)
         VALUES (@code,@name,@route,@guideName,@guidePhone,@pinHash,'active',3,1,'qingyan-north',@startsAt,@createdAt)`
      )
      .run({
        code: DEMO_CODE,
        name: "黔行三日 · 数博会来宾团",
        route: "青岩 — 黄果树 — 黔灵山",
        guideName: "周导",
        guidePhone: "138 8521 2618",
        pinHash: hashPin(DEMO_PIN),
        startsAt: iso(now),
        createdAt: iso(now),
      });

    const insDay = sqlite.prepare(
      `INSERT INTO tour_days (id,tour_code,day_index,date,title) VALUES (?,?,?,?,?)`
    );
    const insStage = sqlite.prepare(
      `INSERT INTO tour_stages (id,tour_code,day_id,seq,name,meeting_time,point,point_hint,is_current,address,location_lng,location_lat,photo,scenic_stops,updated_at)
       VALUES (@id,@tourCode,@dayId,@seq,@name,@meetingTime,@point,@pointHint,@isCurrent,@address,@lng,@lat,@photo,@scenicStops,@updatedAt)`
    );

    type SeedStage = {
      seq: number; name: string; meetingTime: string; point: string; pointHint: string;
      address?: string; lng?: number; lat?: number; photo?: string; scenicStops?: { name: string; address?: string; location?: { lng: number; lat: number } }[]; updatedAt: string; isCurrent?: boolean;
    };
    const days: { day: number; date: string; title: string; stages: SeedStage[] }[] = [
      {
        day: 1, date: iso(now), title: "青岩古镇 · 石头城",
        stages: [
          { seq: 1, name: "北门城楼集合入城", meetingTime: iso(now - 55 * 60_000), point: "青岩古镇北门城楼", pointHint: "城楼下的石狮子旁，举蓝色队旗", address: "贵州省贵阳市花溪区青岩古镇北街入口", lng: 106.6872, lat: 26.3368, photo: "/demo/qingyan-gate.svg", scenicStops: [{ name: "慈云寺广场 · 石牌坊", address: "贵州省贵阳市花溪区青岩古镇慈云寺前", location: { lng: 106.6891, lat: 26.3349 } }], updatedAt: iso(now - 55 * 60_000) },
          { seq: 2, name: "背街石巷 · 自由探索", meetingTime: iso(now + 37 * 60_000), point: "慈云寺广场 · 石牌坊下", pointHint: "广场东侧石牌坊，近状元蹄老店", address: "贵州省贵阳市花溪区青岩古镇慈云寺前", lng: 106.6891, lat: 26.3349, photo: "/demo/ciyun-square.svg", updatedAt: iso(now - 12 * 60_000), isCurrent: true },
          { seq: 3, name: "返程集合", meetingTime: iso(now + 125 * 60_000), point: "北门停车场 · 3 号车位", pointHint: "来时下车处，车牌贵 A·D30218", address: "贵州省贵阳市花溪区青岩古镇北门东侧", lng: 106.6878, lat: 26.3381, updatedAt: iso(now - 12 * 60_000) },
        ],
      },
      {
        day: 2, date: iso(now + dayMs), title: "黄果树 · 大瀑布",
        stages: [
          { seq: 1, name: "酒店集合出发", meetingTime: iso(now + dayMs - 3.5 * 60 * 60_000), point: "贵阳饭店大堂", pointHint: "行李直接上车，8:30 准时发车", address: "贵州省贵阳市云岩区中华北路 3 号", lng: 106.7132, lat: 26.5786, updatedAt: iso(now - 12 * 60_000) },
          { seq: 2, name: "大瀑布景区 · 自由游览", meetingTime: iso(now + dayMs + 2.5 * 60 * 60_000), point: "观瀑台 · 水帘洞入口", pointHint: "雨衣在景区门口找周导领取", address: "黄果树大瀑布景区观瀑台", lng: 105.6721, lat: 25.9802, photo: "/demo/huangguoshu.svg", updatedAt: iso(now - 12 * 60_000) },
          { seq: 3, name: "返程贵阳", meetingTime: iso(now + dayMs + 8 * 60 * 60_000), point: "景区停车场 · 3 号车位", pointHint: "原车原位，17:00 发车", address: "黄果树景区游客服务中心旁", lng: 105.6745, lat: 25.9841, updatedAt: iso(now - 12 * 60_000) },
        ],
      },
      {
        day: 3, date: iso(now + 2 * dayMs), title: "黔灵山 · 送站",
        stages: [
          { seq: 1, name: "黔灵山公园", meetingTime: iso(now + 2 * dayMs + 1 * 60 * 60_000), point: "弘福寺前广场", pointHint: "缆车站旁，看蓝色队旗", address: "贵州省贵阳市云岩区黔灵山公园弘福寺", lng: 106.6968, lat: 26.6059, photo: "/demo/qianling.svg", updatedAt: iso(now - 12 * 60_000) },
          { seq: 2, name: "送贵阳北站", meetingTime: iso(now + 2 * dayMs + 5 * 60 * 60_000), point: "北站东进站口", pointHint: "预留 40 分钟进站，团到此解散", address: "贵州省贵阳市观山湖区贵阳北站", lng: 106.6715, lat: 26.6197, updatedAt: iso(now - 12 * 60_000) },
        ],
      },
    ];

    for (const d of days) {
      const dayId = `${DEMO_CODE}-day${d.day}`;
      insDay.run(dayId, DEMO_CODE, d.day, d.date, d.title);
      for (const s of d.stages) {
        insStage.run({
          id: `${dayId}-s${s.seq}`, tourCode: DEMO_CODE, dayId, seq: s.seq, name: s.name,
          meetingTime: s.meetingTime, point: s.point, pointHint: s.pointHint,
          isCurrent: s.isCurrent ? 1 : 0, address: s.address ?? null,
          lng: s.lng ?? null, lat: s.lat ?? null, photo: s.photo ?? null, scenicStops: JSON.stringify(s.scenicStops ?? []), updatedAt: s.updatedAt,
        });
      }
    }

    // 成员
    const insMember = sqlite.prepare(
      `INSERT INTO members (id,tour_code,nickname,member_token_hash,language,interest,story_length,status,story_done,location_consent,joined_at,last_seen_at)
       VALUES (@id,@tourCode,@nickname,@tokenHash,@language,@interest,'short',@status,@storyDone,0,@joinedAt,@lastSeenAt)`
    );
    const members = [
      { id: "u1", nickname: "林先生", language: "zh", interest: "culture", status: "checked_in", storyDone: 1, token: DEMO_MEMBER_TOKENS.u1 },
      { id: "u2", nickname: "Sarah", language: "en", interest: "nature", status: "checked_in", storyDone: 1 },
      { id: "u3", nickname: "王阿姨", language: "zh", interest: "culture", status: "help_pending", storyDone: 0 },
      { id: "u4", nickname: "小陈", language: "zh", interest: "nature", status: "checked_in", storyDone: 1 },
      { id: "u5", nickname: "David", language: "en", interest: "culture", status: "joined", storyDone: 0 },
      { id: "u6", nickname: "小豆子一家", language: "zh", interest: "nature", status: "checked_in", storyDone: 1 },
    ];
    for (const m of members) {
      insMember.run({
        id: m.id, tourCode: DEMO_CODE, nickname: m.nickname,
        tokenHash: m.token ? hashToken(m.token) : `noscan-${m.id}`,
        language: m.language, interest: m.interest, status: m.status,
        storyDone: m.storyDone, joinedAt: iso(now - 60 * 60_000), lastSeenAt: iso(now - 2 * 60_000),
      });
    }

    // 演示预置异常（王阿姨 · 迟到）
    sqlite
      .prepare(
        `INSERT INTO alerts (id,tour_code,member_id,member_nickname,type,summary,landmark_text,status,created_at)
         VALUES (@id,@tourCode,@memberId,@nickname,'delay',@summary,@landmark,'open',@createdAt)`
      )
      .run({
        id: `${DEMO_CODE}-a1`, tourCode: DEMO_CODE, memberId: "u3", nickname: "王阿姨",
        summary: "「腿有点累，可能会迟到十分钟」——阿黔已停止闲聊并转交您处理",
        landmark: "背街中段 · 石砌拱门附近", createdAt: iso(now - 90 * 1000),
      });

    // 知识卡（三条 verified，对应 cannedAnswers）
    const insCard = sqlite.prepare(
      `INSERT INTO knowledge_cards (id,tour_code,route_key,stage_key,category,title,content_zh_short,content_zh_deep,content_en_short,content_en_deep,keywords,dont_say,source_title,source_url,authorization,verified_at,status)
       VALUES (@id,@tourCode,'qingyan-north',@stageKey,@category,@title,@zhShort,@zhDeep,@enShort,@enDeep,@keywords,@dontSay,@sourceTitle,@sourceUrl,'verified',@verifiedAt,'verified')`
    );
    insCard.run({
      id: "kc-facility-toilet", tourCode: DEMO_CODE, stageKey: "ciyun", category: "facility", title: "慈云寺广场附近设施",
      zhShort: "离您最近的洗手间在慈云寺广场西侧，步行约 3 分钟，门口有蓝色指示牌。背街中段也有一处直饮水点。",
      zhDeep: "离您最近的洗手间在慈云寺广场西侧，步行约 3 分钟，门口有蓝色指示牌。背街中段也有一处直饮水点，可以接热水。",
      enShort: "The nearest restroom is on the west side of Ciyun Temple Square, about a 3-minute walk, marked with a blue sign. There is also a drinking-water point mid-way along Beijie.",
      enDeep: "The nearest restroom is on the west side of Ciyun Temple Square, about a 3-minute walk, marked with a blue sign. A drinking-water point mid-way along Beijie also offers hot water.",
      keywords: JSON.stringify(["厕所", "洗手间", "卫生间", "水", "热水", "喝", "wc", "toilet", "restroom", "water", "drink"]),
      dontSay: JSON.stringify(["不要编造未核验的商铺位置"]),
      sourceTitle: "青岩景区导览图 · 周导 5 月核验", sourceUrl: null, verifiedAt: iso(now - 30 * dayMs),
    });
    insCard.run({
      id: "kc-culture-stone", tourCode: DEMO_CODE, stageKey: "beijie", category: "culture", title: "青岩为何是石头城",
      zhShort: "青岩建于明洪武年间，原是军事屯堡。就地取用的青石板耐风化、能防火，石墙配上马头墙，既有江南营造的影子，也适应了贵州多雨的山地。",
      zhDeep: "青岩建于明洪武年间，原是军事屯堡。就地取用的青石板耐风化、能防火，石墙配上「马头墙」，既有江南营造的影子，也适应了贵州多雨的山地。你现在脚下的背街，石板路被六百年的脚步磨得发亮，正是「石头城」名字的由来。",
      enShort: "Qingyan was founded in the early Ming dynasty as a military fort. The local bluestone resists weather and fire; stone walls with horse-head gables echo Jiangnan architecture while suiting Guizhou's rainy hills.",
      enDeep: "Qingyan was founded in the early Ming dynasty as a military garrison town. Locally quarried bluestone resists weathering and fire; its stone walls topped with horse-head gables carry an echo of Jiangnan building traditions while adapting to Guizhou's rainy mountains. The flagstones of Beijie under your feet, polished by six centuries of footsteps, are the origin of the name 'Stone Town'.",
      keywords: JSON.stringify(["石头", "石板", "为什么", "历史", "故事", "背街", "城", "屯堡", "马头墙", "stone", "why", "history", "town", "wall"]),
      dontSay: JSON.stringify(["不夸大民族传说", "不添加未入库的仪式与禁忌"]),
      sourceTitle: "《青岩镇志》· 周导已审核", sourceUrl: null, verifiedAt: iso(now - 30 * dayMs),
    });
    insCard.run({
      id: "kc-culture-beijie-film", tourCode: DEMO_CODE, stageKey: "beijie", category: "culture", title: "背街的电影记忆",
      zhShort: "您脚下的背街是青岩最有电影感的一条巷子——姜文《寻枪》曾在这里取景。两侧石墙随山势起伏，最窄处只容两人侧身。",
      zhDeep: "您脚下的背街是青岩最有电影感的一条巷子——姜文《寻枪》曾在这里取景。两侧石墙随山势起伏，最窄处只容两人侧身。建议您抬头看看墙头的「马头墙」，那是屯堡人从江淮带来的营造记忆。",
      enShort: "The Beijie alley under your feet is Qingyan's most cinematic lane—Jiang Wen's film 'The Missing Gun' was shot here. Its stone walls rise and fall with the hillside, narrowing to barely two people wide.",
      enDeep: "The Beijie alley under your feet is Qingyan's most cinematic lane—Jiang Wen's film 'The Missing Gun' was shot here. Its stone walls rise and fall with the hillside, narrowing to where only two people can pass sideways. Look up at the horse-head gables—a building memory the garrison settlers brought from the Jiang-Huai region.",
      keywords: JSON.stringify(["背街", "电影", "寻枪", "姜文", "巷", "最窄", "马头墙", "film", "movie", "alley", "narrow"]),
      dontSay: JSON.stringify([]),
      sourceTitle: "《青岩镇志》· 周导已审核", sourceUrl: null, verifiedAt: iso(now - 30 * dayMs),
    });

    // 观察任务（按团归属）
    sqlite
      .prepare(`INSERT INTO story_tasks (id,tour_code,route_key,title,brief,clues) VALUES (?,?,?,?,?,?)`)
      .run(
        "task-stone-town", DEMO_CODE, "qingyan-north", "石头城的三个线索",
        "在背街自由探索时，找到「石街、石墙、石城门」，拍下一处你最喜欢的，并用一句话说说它。",
        JSON.stringify(["石街", "石墙", "石城门"])
      );

    // 林先生（u1）的演示故事卡，供 /story/[id] 展示
    sqlite
      .prepare(
        `INSERT INTO story_cards (id,tour_code,member_id,title,owner,route,date,stories,observation,sources,created_at)
         VALUES (@id,@tourCode,@memberId,@title,@owner,@route,@date,@stories,@observation,@sources,@createdAt)`
      )
      .run({
        id: "demo", tourCode: DEMO_CODE, memberId: "u1", title: "石头城的三个线索",
        owner: "林先生", route: "青岩古镇北线", date: iso(now),
        stories: JSON.stringify([
          { title: "背街：被脚步磨亮的石板路", note: "听完了 90 秒中文深度版", source: "《青岩镇志》" },
          { title: "马头墙：军事屯堡里的江南影子", note: "听完了 60 秒中文标准版", source: "贵州省博物馆 · 屯堡文化展陈资料" },
        ]),
        observation: JSON.stringify({
          task: "找到「石街、石墙、石城门」，拍下一处你最喜欢的",
          answer: "我选了石城门——定广门。门洞里的光落在石板上，像一条被时间磨亮的河。",
        }),
        sources: JSON.stringify(["《青岩镇志》", "贵州省博物馆 · 屯堡文化展陈资料", "周导现场核验（2026.05）"]),
        createdAt: iso(now),
      });
  });

  tx();
  return { code: DEMO_CODE };
}
