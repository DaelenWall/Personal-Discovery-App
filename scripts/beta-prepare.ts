import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { isPrivateIPv4 } from "../src/server/beta-access";

const folder = resolve(process.env.DISCOVERY_BETA_DIR || "data/beta");
const addresses = Object.entries(networkInterfaces())
  .filter(([name]) => !name.startsWith("utun"))
  .flatMap(([, entries]) => entries ?? [])
  .filter(
    (entry) =>
      entry.family === "IPv4" &&
      !entry.internal &&
      isPrivateIPv4(entry.address),
  );
const bind = process.env.DISCOVERY_BETA_BIND || addresses[0]?.address;
const host = process.env.DISCOVERY_BETA_HOST || hostname();
const port = Number(process.env.DISCOVERY_BETA_PORT || 4433);
if (!bind || (!isPrivateIPv4(bind) && bind !== "127.0.0.1"))
  throw new Error(
    "Connect your Mac to private Wi-Fi, or set DISCOVERY_BETA_BIND to its private IPv4 address.",
  );
if (
  !isPrivateIPv4(host) &&
  host !== "127.0.0.1" &&
  !/^[a-z0-9-]+\.local$/i.test(host)
)
  throw new Error(
    "Use the Mac's .local name or a private IPv4 address for the beta host.",
  );
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Use a beta port between 1024 and 65535.");
mkdirSync(folder, { recursive: true, mode: 0o700 });
const caKey = join(folder, "root-key.pem");
const caCert = join(folder, "root-cert.pem");
if (!existsSync(caKey) || !existsSync(caCert)) {
  const caConfig = join(folder, "root.cnf");
  writeFileSync(
    caConfig,
    "[req]\ndistinguished_name=dn\nx509_extensions=ca\nprompt=no\n[dn]\nCN=Commonplace Private Beta Root\n[ca]\nbasicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\n",
  );
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-sha256",
      "-days",
      "365",
      "-keyout",
      caKey,
      "-out",
      caCert,
      "-config",
      caConfig,
    ],
    { stdio: "ignore" },
  );
  chmodSync(caKey, 0o600);
}
const key = join(folder, "server-key.pem");
const csr = join(folder, "server.csr");
const certificate = join(folder, "server-cert.pem");
const extensions = join(folder, "server.cnf");
const dns = host.endsWith(".local") ? `DNS:${host},` : "";
writeFileSync(
  extensions,
  `basicConstraints=CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=${dns}IP:${bind},IP:127.0.0.1\n`,
);
execFileSync(
  "openssl",
  [
    "req",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    csr,
    "-subj",
    `/CN=${host}`,
  ],
  { stdio: "ignore" },
);
execFileSync(
  "openssl",
  [
    "x509",
    "-req",
    "-in",
    csr,
    "-CA",
    caCert,
    "-CAkey",
    caKey,
    "-CAcreateserial",
    "-out",
    certificate,
    "-days",
    "90",
    "-sha256",
    "-extfile",
    extensions,
  ],
  { stdio: "ignore" },
);
chmodSync(key, 0o600);
const der = execFileSync("openssl", ["x509", "-in", caCert, "-outform", "DER"]);
const identifier = randomUUID();
writeFileSync(
  join(folder, "Commonplace-Beta.mobileconfig"),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>PayloadType</key><string>Configuration</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>local.commonplace.beta.${identifier}</string><key>PayloadUUID</key><string>${identifier}</string><key>PayloadDisplayName</key><string>Commonplace Private Beta</string><key>PayloadDescription</key><string>Trust the private HTTPS service on your own Mac. This profile contains only its local root certificate.</string><key>PayloadContent</key><array><dict><key>PayloadType</key><string>com.apple.security.root</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>local.commonplace.beta.certificate</string><key>PayloadUUID</key><string>${randomUUID()}</string><key>PayloadDisplayName</key><string>Commonplace Private Beta Root</string><key>PayloadContent</key><data>${der.toString("base64")}</data></dict></array></dict></plist>`,
);
if (!existsSync(join(folder, "access.json")))
  writeFileSync(
    join(folder, "access.json"),
    JSON.stringify({ token: randomBytes(32).toString("hex") }),
    { mode: 0o600 },
  );
writeFileSync(
  join(folder, "config.json"),
  JSON.stringify(
    { host, bind, port, origin: new URL(`https://${host}:${port}`).origin },
    null,
    2,
  ),
);
const fingerprint = execFileSync(
  "openssl",
  ["x509", "-in", caCert, "-noout", "-fingerprint", "-sha256"],
  { encoding: "utf8" },
).trim();
console.log(
  `Private beta prepared: https://${host}:${port}/phone\nCertificate profile: ${join(folder, "Commonplace-Beta.mobileconfig")}\n${fingerprint}\nNo system trust settings were changed. Run npm run beta:start after a production build.`,
);
