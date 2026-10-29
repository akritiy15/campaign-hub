import { createApp } from "./app";
import { config } from "./config";
import { MySqlRepository } from "./mysqlRepository";

async function main() {
  const repo = new MySqlRepository(config.db);
  await repo.ping(); // fail fast if the database is unreachable

  const app = createApp(repo, { apiKey: config.apiKey, corsOrigin: config.corsOrigin });
  const server = app.listen(config.port, () => {
    console.log(`Campaign Hub API listening on :${config.port}  (docs: /docs)`);
  });

  const shutdown = () => {
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
