export function assertLocalRequest(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  // Next.js can normalize request.url to localhost even when the browser uses 127.0.0.1.
  const host = request.headers.get("host") ?? target.host;
  const betaOrigin = process.env.DISCOVERY_BETA_ORIGIN
    ? new URL(process.env.DISCOVERY_BETA_ORIGIN)
    : undefined;
  const betaHost =
    betaOrigin?.protocol === "https:" &&
    host.toLowerCase() === betaOrigin.host.toLowerCase();
  if (!betaHost && !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host))
    throw new Error("This app accepts localhost requests only.");
  if (origin && new URL(origin).host !== host)
    throw new Error("Only requests from this app are accepted.");
  if (betaHost && origin && origin !== betaOrigin!.origin)
    throw new Error("Use the private HTTPS beta address.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Error("Cross-site requests are not accepted.");
}

export async function readJson(request: Request) {
  const raw = await request.text();
  if (raw.length > 150_000)
    throw new Error("This request is too large. Use a shorter source.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON request.");
  }
}

export function errorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "The request could not be completed.";
  return Response.json({ error: message }, { status: 400 });
}
