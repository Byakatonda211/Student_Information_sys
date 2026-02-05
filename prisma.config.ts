import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Use JS seed (works with Prisma adapter-pg + Node 24)
    seed: "node ./prisma/seed.js",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
