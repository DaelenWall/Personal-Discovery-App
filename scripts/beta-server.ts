import next from "next";
import { createServer } from "node:https";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BetaAccess, isPrivateIPv4 } from "../src/server/beta-access";

const folder = resolve(process.env.DISCOVERY_BETA_DIR || "data/beta");
if (!existsSync(join(folder, "config.json")))
  throw new Error("Run npm run beta:prepare first.");
const config = JSON.parse(
  readFileSync(join(folder, "config.json"), "utf8"),
) as { host: string; bind: string; port: number; origin: string };
if (!isPrivateIPv4(config.bind) && config.bind !== "127.0.0.1")
  throw new Error(
    "The beta server must bind to a private or loopback address.",
  );
config.origin = new URL(config.origin).origin;
const build = readFileSync(resolve(".next/BUILD_ID"), "utf8").trim();
process.env.DISCOVERY_BETA_ORIGIN = config.origin;
process.env.NEXT_TELEMETRY_DISABLED = "1";
const access = new BetaAccess(
  JSON.parse(readFileSync(join(folder, "access.json"), "utf8")).token,
);
writeFileSync(
  join(folder, "pairing.json"),
  JSON.stringify({
    code: access.code,
    expiresAt: access.expiresAt,
    origin: config.origin,
  }),
  { mode: 0o600 },
);
const app = next({ dev: false, hostname: config.host, port: config.port });
await app.prepare();
const handle = app.getRequestHandler();
const pairingPage = (error = "") =>
  `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Pair your private Commonplace beta</title><style>body{background:#f7f6f1;color:#282f2a;font:16px/1.7 system-ui;padding:24px;max-width:480px;margin:auto}h1{font:38px/1.2 Georgia}input,button{box-sizing:border-box;width:100%;font:inherit;min-height:48px;padding:12px;margin:10px 0;border:1px solid #697068;border-radius:6px}button{background:#345b42;color:white}a{color:#345b42}.error{color:#9e4435}</style></head><body><p>COMMONPLACE · PRIVATE IPHONE BETA</p><h1>Pair this device.</h1><p>Enter the pairing code shown in the terminal on your Mac. No reading data is available until this device is paired.</p>${error ? `<p class="error">${error}</p>` : ""}<form action="/beta/pair" method="post"><label for="code">Pairing code</label><input id="code" name="code" required maxlength="20" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false"><button>Pair and open Commonplace</button></form><p>Once paired, use Safari’s Share → Add to Home Screen → Open as Web App.</p><p><a href="/beta/certificate.mobileconfig">Download this Mac’s beta certificate profile</a></p></body></html>`;

const server = createServer(
  {
    key: readFileSync(join(folder, "server-key.pem")),
    cert: Buffer.concat([
      readFileSync(join(folder, "server-cert.pem")),
      readFileSync(join(folder, "root-cert.pem")),
    ]),
  },
  async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    if (
      request.headers.host?.toLowerCase() !==
      new URL(config.origin).host.toLowerCase()
    ) {
      response.writeHead(403);
      response.end("Unknown beta host.");
      return;
    }
    const url = new URL(request.url || "/", config.origin);
    if (url.pathname === "/beta/health") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ ready: true, version: "0.1.0-beta.1" }));
      return;
    }
    if (
      url.pathname === "/beta/certificate.mobileconfig" &&
      request.method === "GET"
    ) {
      response.setHeader("Content-Type", "application/x-apple-aspen-config");
      response.setHeader(
        "Content-Disposition",
        'attachment; filename="Commonplace-Beta.mobileconfig"',
      );
      response.end(readFileSync(join(folder, "Commonplace-Beta.mobileconfig")));
      return;
    }
    if (url.pathname === "/beta/pair" && request.method === "POST") {
      if (request.headers.origin !== config.origin) {
        response.writeHead(403);
        response.end("Open the pairing page on this Mac’s beta address.");
        return;
      }
      let body = "";
      try {
        for await (const part of request) {
          body += part.toString();
          if (body.length > 1000) throw new Error("Pairing request too large.");
        }
      } catch {
        response.writeHead(400);
        response.end("Invalid pairing request.");
        return;
      }
      if (
        !access.pair(
          new URLSearchParams(body).get("code") || "",
          request.socket.remoteAddress || "unknown",
        )
      ) {
        response.writeHead(403, { "Content-Type": "text/html" });
        response.end(
          pairingPage(
            "Code invalid, expired, or too many attempts. Check your Mac and try again shortly.",
          ),
        );
        return;
      }
      response.setHeader("Set-Cookie", access.cookie());
      response.writeHead(303, { Location: "/phone" });
      response.end();
      return;
    }
    if (!access.authorized(request.headers.cookie)) {
      if (url.pathname.startsWith("/api/")) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            error: "Pair this device with your Mac’s beta service first.",
          }),
        );
      } else {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(pairingPage());
      }
      return;
    }
    if (url.pathname === "/phone-sw.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.setHeader("Cache-Control", "no-cache");
      response.setHeader("Service-Worker-Allowed", "/phone");
      response.end(
        readFileSync(resolve("public/phone-sw.js"), "utf8").replace(
          "__VERSION__",
          build,
        ),
      );
      return;
    }
    try {
      await handle(request, response);
    } catch {
      if (!response.headersSent) response.writeHead(500);
      response.end("The beta service could not complete this request.");
    }
  },
);
server.listen(config.port, config.bind, () =>
  console.log(
    `PRIVATE_BETA_READY ${config.origin}/phone\nPAIRING_CODE ${access.code}\nPairing code expires in 30 minutes. Keep this Mac awake on the same private network.\nCertificate profile: ${join(folder, "Commonplace-Beta.mobileconfig")}`,
  ),
);
async function stop() {
  server.close();
  await app.close();
  process.exit(0);
}
process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());
