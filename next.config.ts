// 阿黔 · AI 副导（贵客松文旅赛道）· 前端与应用代码
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，必须在服务端外部化，不能被打包进 bundle
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
