import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { validateSourceText } from "../domain/ingestion";

export function isPublicAddress(address: string) {
  if (address.includes(":")) {
    // IPv4-mapped, unique-local, link-local, multicast, unspecified, documentation.
    if (/^::|^f[cd]|^fe[89ab]|^ff|^2001:db8/i.test(address)) return false;
    // Restrict IPv6 to global unicast; unusual transition ranges are unnecessary here.
    return /^2[0-9a-f]{3}:/i.test(address) && !/^200[12]:/i.test(address);
  }
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

export function validatePublicUrl(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error(
      "Use a public HTTP or HTTPS URL without credentials or a custom port.",
    );
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    (!host.includes(".") && !isIP(host)) ||
    (isIP(host) && !isPublicAddress(host))
  )
    throw new Error("Local and private network URLs cannot be imported.");
  return url;
}

async function fetchDocument(
  value: string,
  redirects = 0,
): Promise<{ html: string; url: string }> {
  if (redirects > 4) throw new Error("This source redirected too many times.");
  const url = validatePublicUrl(value);
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  if (
    !addresses.length ||
    addresses.some((entry) => !isPublicAddress(entry.address))
  )
    throw new Error("This URL resolves to a private or unsupported address.");
  // Pin the vetted address for the connection, including every redirect.
  const result = await new Promise<{ html?: string; redirect?: string }>(
    (resolve, reject) => {
      const send = url.protocol === "https:" ? httpsRequest : httpRequest;
      const request = send(
        url,
        {
          signal: AbortSignal.timeout(10_000),
          family: addresses[0].family,
          lookup: (_hostname, _options, callback) =>
            callback(null, addresses[0].address, addresses[0].family),
          headers: {
            "User-Agent": "PersonalDiscovery/1.0 (local personal reading tool)",
            Accept: "text/html,text/plain",
            "Accept-Encoding": "identity",
          },
        },
        (response) => {
          const status = response.statusCode ?? 500;
          if (
            [301, 302, 303, 307, 308].includes(status) &&
            response.headers.location
          ) {
            response.destroy();
            resolve({ redirect: new URL(response.headers.location, url).href });
            return;
          }
          if (status < 200 || status >= 300) {
            response.destroy();
            reject(
              new Error(
                `Source returned HTTP ${status}. Paste accessible text instead.`,
              ),
            );
            return;
          }
          if (
            !/text\/html|text\/plain|application\/xhtml/.test(
              response.headers["content-type"] ?? "",
            )
          ) {
            response.destroy();
            reject(
              new Error(
                "This source is not an HTML article or text. Paste readable text instead.",
              ),
            );
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 1_500_000) {
              request.destroy(new Error("This page is too large to extract."));
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () =>
            resolve({ html: Buffer.concat(chunks).toString("utf8") }),
          );
          response.on("error", reject);
        },
      );
      request.on("error", reject);
      request.end();
    },
  );
  if (result.redirect) return fetchDocument(result.redirect, redirects + 1);
  return { html: result.html!, url: url.href };
}

export function extractReadable(html: string, url: string) {
  const { document } = parseHTML(html);
  const author =
    document.querySelector('meta[name="author"]')?.getAttribute("content") ??
    undefined;
  const publishedAt =
    document
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute("content") ?? undefined;
  const article = new Readability(document as unknown as Document).parse();
  if (!article?.textContent)
    throw new Error(
      "Readable extraction failed. Paste accessible article text instead.",
    );
  const text = validateSourceText(article.textContent);
  return {
    title: (article.title || document.title || new URL(url).hostname).slice(
      0,
      200,
    ),
    rawText: text,
    author: article.byline ?? author,
    publisher: new URL(url).hostname,
    publishedAt,
    url,
  };
}

export async function extractUrl(url: string) {
  const page = await fetchDocument(url);
  if (!/<(?:html|article|body)\b/i.test(page.html))
    return {
      title: new URL(page.url).hostname,
      rawText: validateSourceText(page.html),
      publisher: new URL(page.url).hostname,
      url: page.url,
    };
  return extractReadable(page.html, page.url);
}
