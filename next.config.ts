import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep builds light on this workstation (SQL Server + Postgres + Docker also run here).
  // Limits the page-data / static-generation worker pool.
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
  },
  // exceljs / prisma are server-only; don't let the bundler trace them into edge/client.
  serverExternalPackages: ["exceljs", "@prisma/client", ".prisma/client"],
};

export default nextConfig;
