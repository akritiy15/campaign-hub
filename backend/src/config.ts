import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  apiKey: process.env.API_KEY ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "campaign_hub",
  },
};
