import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * 集合点照片上传。
 * 创建团时还没有导游会话，因此图片先落到本应用的公开静态目录；创建动作只会把
 * 返回的短 URL 写入行程表。这样游客端读取的不是浏览器临时 blob 地址。
 */
const ACCEPTED_IMAGES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择一张图片后再上传" }, { status: 400 });
    }
    const extension = ACCEPTED_IMAGES[file.type];
    if (!extension) {
      return NextResponse.json({ error: "仅支持 JPG、PNG 或 WebP 图片" }, { status: 415 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 413 });
    }

    const directory = path.join(process.cwd(), "public", "uploads", "meeting-points");
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/meeting-points/${filename}` });
  } catch {
    return NextResponse.json({ error: "图片上传失败，请检查网络后重试" }, { status: 500 });
  }
}
