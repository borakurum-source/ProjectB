import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_M9fLlxUO4NTi@ep-summer-butterfly-b2v4rkg4-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  verbose: true,
});

