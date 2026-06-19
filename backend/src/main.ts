import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { validateRuntimeConfiguration } from "./config/runtime-checks.js";

validateRuntimeConfiguration(env);

const app = createApp();

app.listen(env.port, env.host, () => {
  console.log(`Backend running on http://${env.host}:${env.port}`);
});
