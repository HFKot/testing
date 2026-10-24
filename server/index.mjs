import { createApp } from "./app.mjs";

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be an integer between 1 and 65535.");
const server = createApp().listen(port, "0.0.0.0", () =>
  console.log(`Voto Claro API listening on port ${port}.`),
);
server.on("error", (error) => {
  console.error(`The API could not start (${error.code ?? "server error"}).`);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
