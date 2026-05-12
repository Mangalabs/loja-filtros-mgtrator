import { createServer } from "node:http";
import { routes } from "./views/routes.js";
import { sendJson } from "./shared/http/json-response.js";

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? "127.0.0.1";

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const route = routes.find((item) => {
    return item.method === request.method && item.path === url.pathname;
  });

  if (!route) {
    sendJson(response, 404, {
      code: 404,
      status: "error",
      message: "Route not found",
    });
    return;
  }

  await route.handler(request, response);
});

server.listen(port, host, () => {
  console.log(`Backend running on http://${host}:${port}`);
});
