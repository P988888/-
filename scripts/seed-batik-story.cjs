// 阿黔布依蜡染故事卡演示数据脚本。
const Database = require("better-sqlite3");

const databasePath = process.argv[2] || "seed/aqian.db";
const tourCode = process.argv[3] || "QY-9696";
const db = new Database(databasePath);
const now = new Date().toISOString();

const tour = db.prepare("SELECT code, route FROM tours WHERE code = ?").get(tourCode);
if (!tour) throw new Error(`未找到旅行团 ${tourCode}`);

const member = db.prepare("SELECT id, nickname FROM members WHERE tour_code = ? ORDER BY joined_at LIMIT 1").get(tourCode);
if (!member) throw new Error(`${tourCode} 暂无游客，无法创建演示故事卡`);

const task = {
  id: `task-batik-${tourCode.toLowerCase()}`,
  title: "石头寨 · 布依蜡染观察任务",
  brief: "看看蜡染布上的花纹：它是直接画上去的，还是先用蜡封住、染色后留出来的？选择答案，再写下一句你记住的细节。",
  clues: ["观察蜡绘花纹", "找出染色后的留白", "写下一句记忆钩子"],
};
const knowledge = {
  id: `kc-batik-${tourCode.toLowerCase()}`,
  title: "石头寨布依蜡染：颜色也可以用留白染出来",
  short: "布依蜡染不是把白花纹直接画在蓝布上，而是先用蜡刀蘸熔蜡在白布上描出纹样。蜡封住的纤维不吸收靛蓝，脱蜡后便留下白色花纹——颜色也可以用‘留白’染出来。",
  deep: "石头寨布依蜡染通常经过画蜡、浸染、脱蜡等步骤：先用蜡刀蘸熔蜡在白布上画出纹样，蜡层暂时封住布纤维；再反复浸入靛蓝染液，未封蜡的位置逐渐染蓝；最后加热脱蜡，被蜡保护的位置显出白色花纹。蜡在冷却和染制中形成的细小冰纹，让每块布都留下不可完全复制的手工痕迹。",
  source: "石头寨布依蜡染非遗工坊 · 传承人审核",
};

const apply = db.transaction(() => {
  db.prepare("DELETE FROM story_tasks WHERE tour_code = ?").run(tourCode);
  db.prepare(`INSERT INTO story_tasks (id,tour_code,route_key,title,brief,clues) VALUES (?,?,?,?,?,?)`).run(
    task.id, tourCode, "shitouzhai-batik", task.title, task.brief, JSON.stringify(task.clues)
  );

  db.prepare(`INSERT INTO knowledge_cards
    (id,tour_code,route_key,stage_key,category,title,content_zh_short,content_zh_deep,content_en_short,content_en_deep,keywords,dont_say,source_title,source_url,authorization,verified_at,status)
    VALUES (@id,@tourCode,'shitouzhai-batik',NULL,'culture',@title,@short,@deep,@enShort,@enDeep,@keywords,@dontSay,@source,NULL,'verified',@verifiedAt,'verified')
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,content_zh_short=excluded.content_zh_short,content_zh_deep=excluded.content_zh_deep,
      content_en_short=excluded.content_en_short,content_en_deep=excluded.content_en_deep,keywords=excluded.keywords,dont_say=excluded.dont_say,
      source_title=excluded.source_title,verified_at=excluded.verified_at,status='verified'`).run({
    ...knowledge,
    tourCode,
    enShort: "Buyi batik creates white motifs by reserving them with wax before indigo dyeing; after the wax is removed, the protected cloth stays white.",
    enDeep: "Buyi batik uses wax-resist dyeing: motifs are drawn in molten wax, the cloth is repeatedly dyed with indigo, and the wax is removed to reveal white patterns and unique crackle marks.",
    keywords: JSON.stringify(["石头寨", "布依", "蜡染", "留白", "靛蓝", "非遗", "花纹", "batik", "wax resist"]),
    dontSay: JSON.stringify(["不编造纹样的固定寓意", "不替传承人虚构个人经历", "检索不到时转人工"]),
    verifiedAt: now,
  });

  db.prepare("DELETE FROM story_cards WHERE tour_code = ? AND member_id = ?").run(tourCode, member.id);
  db.prepare(`INSERT INTO story_cards (id,tour_code,member_id,title,owner,route,date,stories,observation,sources,created_at)
    VALUES (@id,@tourCode,@memberId,@title,@owner,@route,@date,@stories,@observation,@sources,@createdAt)`).run({
    id: `story-batik-${tourCode.toLowerCase()}`,
    tourCode,
    memberId: member.id,
    title: "石头寨 · 布依蜡染",
    owner: member.nickname,
    route: "黄果树 → 石头寨",
    date: now,
    stories: JSON.stringify([
      { title: "颜色也可以用“留白”染出来", note: knowledge.deep, source: knowledge.source },
      { title: "蜡封住的地方，就是布的呼吸", note: "完成观察选择并听完 60—90 秒审核讲解后，保存的一句可复述记忆点。", source: "布依族蜡染技艺现场讲解稿 · 版本 2026.08" },
    ]),
    observation: JSON.stringify({
      task: "看看蜡染布上的花纹，是画上去的还是留出来的？",
      answer: "是先用蜡封住，再染色后留出来的。颜色也可以用留白染出来。",
    }),
    sources: JSON.stringify([knowledge.source, "布依族蜡染技艺现场讲解稿 · 版本 2026.08", "彭导现场核验（2026.08）"]),
    createdAt: now,
  });
  db.prepare("UPDATE members SET story_done = 1 WHERE id = ?").run(member.id);
});

apply();
console.log(JSON.stringify({ ok: true, tourCode, storyCardId: `story-batik-${tourCode.toLowerCase()}`, member: member.nickname }, null, 2));
db.close();
