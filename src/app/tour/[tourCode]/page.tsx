import { AppShell } from "@/components/app-shell";
import { TouristApp } from "@/components/tourist/tourist-app";
import { redirect, notFound } from "next/navigation";
import { getMember } from "@/lib/auth/session";
import { getDays, getTourByCode } from "@/lib/db/queries";
import { seedDemoTour } from "@/lib/db/seed";

/**
 * 游客端主页面（H5）。
 * 后端接入后：按 tourCode 读库取团与多日行程，member token 经 HttpOnly Cookie 校验；
 * 「今天」由 tours.current_day 决定，当天结束后自动切换到下一天。
 */
export default async function TourPage({
  params,
}: {
  params: Promise<{ tourCode: string }>;
}) {
  const { tourCode } = await params;
  const code = tourCode.toUpperCase();
  if (code === "QY-1024") seedDemoTour();
  const tour = getTourByCode(code);
  if (!tour) notFound();
  const member = await getMember(code);
  if (!member) redirect(`/join?code=${encodeURIComponent(code)}`);
  const days = getDays(code);

  return (
    <AppShell>
      <TouristApp
        tour={tour}
        days={days}
        currentDay={tour.currentDay}
        initialMessages={[]}
      />
    </AppShell>
  );
}
