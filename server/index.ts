import { createServer } from "./server.js";
import { config } from "./config/env.js";

const app = await createServer();

const server = app.listen(config.port, () => {
  console.log(`Flexiple sourcing API running on http://localhost:${config.port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}. Closing server.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
