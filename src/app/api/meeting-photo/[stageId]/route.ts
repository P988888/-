import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * 集合点照片代理：从数据库查出本节点的图片地址，再从 public 目录读取并返回。
 * 这样即使部署层没有单独映射 public/uploads，游客端仍能可靠加载导游上传的图片。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const { stageId } = await params;
  const stage = db
    .select({ photo: schema.tourStages.photo })
    .from(schema.tourStages)
    .where(eq(schema.tourStages.id, stageId))
    .get();
  if (!stage?.photo) return new NextResponse(null, { status: 404 });

  const pathname = photoPathname(stage.photo);
  if (!pathname) return new NextResponse(null, { status: 404 });
  const absolutePath = path.resolve(PUBLIC_ROOT, `.${pathname}`);
  if (!absolutePath.startsWith(`${PUBLIC_ROOT}${path.sep}`)) return new NextResponse(null, { status: 400 });

  try {
    const image = await readFile(absolutePath);
    const contentType = CONTENT_TYPES[path.extname(absolutePath).toLowerCase()];
    if (!contentType) return new NextResponse(null, { status: 415 });
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

function photoPathname(value: string) {
  try {
    const pathname = new URL(value, "http://localhost").pathname;
    return pathname.startsWith("/demo/") || pathname.startsWith("/uploads/meeting-points/") ? pathname : "";
  } catch {
    return "";
  }
}
