import { AppShell } from "@/components/app-shell";
import { GuideApp } from "@/components/guide/guide-app";
import { notFound, redirect } from "next/navigation";
import { isGuide } from "@/lib/auth/session";
import { getAlerts, getDays, getKnowledgeCards, getMembers, getTourByCode } from "@/lib/db/queries";
import { seedDemoTour } from "@/lib/db/seed";

/**
 * 导游端（/guide/[tourCode]）。
 * 后端接入后：Server Action 校验口令哈希 Cookie，SWR 2 秒轮询 /api/status。
 */
export default async function GuideTourPage({
  params,
}: {
  params: Promise<{ tourCode: string }>;
}) {
  const { tourCode } = await params;
  const code = tourCode.toUpperCase();
  if (code === "QY-1024") seedDemoTour();
  const tour = getTourByCode(code);
  if (!tour) notFound();
  if (!(await isGuide(code))) redirect(`/guide?code=${encodeURIComponent(code)}`);

  return (
    <AppShell>
      <GuideApp
        tour={tour}
        days={getDays(code)}
        initialCurrentDay={tour.currentDay}
        members={getMembers(code)}
        initialAlerts={getAlerts(code)}
        initialKnowledge={getKnowledgeCards(code)}
      />
    </AppShell>
  );
}
