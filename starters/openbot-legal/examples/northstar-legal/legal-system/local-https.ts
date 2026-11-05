/**
 * A loopback-only https address for Northstar Legal, for a laptop that should not open a public tunnel.
 *
 * OpenBot adds an MCP server by URL only over https at a dotted public hostname (no `localhost`, no IP
 * literals). `legal.localtest.me` is a public DNS name that resolves to 127.0.0.1 and ::1, so this serves
 * https://legal.localtest.me:4321 on the loopback interface only and forwards to Northstar Legal on
 * http://127.0.0.1:4320. Nothing listens on any other interface, and nothing is reachable from outside
 * this machine.
 *
 * The certificate comes from a throwaway local CA that only the OpenBot server process trusts, through
 * NODE_EXTRA_CA_CERTS. The system trust store is not touched.
 *
 *   bun examples/northstar-legal/legal-system/local-https.ts cert    # once: CA + leaf in .local-https/
 *   bun examples/northstar-legal/legal-system/local-https.ts         # serve
 *   NODE_EXTRA_CA_CERTS=$PWD/examples/northstar-legal/legal-system/.local-https/ca.pem bash scripts/start.sh
 *   NORTHSTAR_LEGAL_URL=https://legal.localtest.me:4321/mcp bun examples/northstar-legal/legal-system/connect.ts
 *
 * `start.sh` keeps an API server that is already running, so stop OpenBot first (scripts/stop.sh) for the
 * CA to reach it.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const HOST = "legal.localtest.me";
const PORT = Number(process.env.NORTHSTAR_LEGAL_HTTPS_PORT ?? 4321);
const TARGET = `http://127.0.0.1:${Number(process.env.NORTHSTAR_LEGAL_PORT ?? 4320)}`;
const DIR = path.join(import.meta.dir, ".local-https");
const file = (name: string) => path.join(DIR, name);

function openssl(args: string[]) {
  const run = Bun.spawnSync(["openssl", ...args], { cwd: DIR, stderr: "pipe" });
  if (run.exitCode !== 0) throw new Error(`openssl ${args[0]} failed: ${run.stderr.toString()}`);
}

if (process.argv[2] === "cert") {
  mkdirSync(DIR, { recursive: true });
  openssl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem", "-days", "30", "-subj", "/CN=Northstar Legal local demo CA"]);
  openssl(["req", "-newkey", "rsa:2048", "-nodes", "-keyout", "leaf.key", "-out", "leaf.csr", "-subj", `/CN=${HOST}`]);
  await Bun.write(
    file("leaf.ext"),
    `subjectAltName=DNS:${HOST}\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`,
  );
  openssl(["x509", "-req", "-in", "leaf.csr", "-CA", "ca.pem", "-CAkey", "ca.key", "-CAcreateserial", "-out", "leaf.pem", "-days", "30", "-extfile", "leaf.ext"]);
  console.log(`Wrote a local CA and a certificate for ${HOST} in ${DIR}.`);
  console.log(`Start OpenBot with NODE_EXTRA_CA_CERTS=${file("ca.pem")}`);
  process.exit(0);
}

if (!existsSync(file("leaf.pem"))) {
  console.error(`No certificate yet. Run: bun ${path.relative(process.cwd(), import.meta.path)} cert`);
  process.exit(1);
}

const tls = { cert: Bun.file(file("leaf.pem")), key: Bun.file(file("leaf.key")) };
async function forward(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const headers = new Headers(req.headers);
  headers.delete("host");
  return fetch(`${TARGET}${url.pathname}${url.search}`, { method: req.method, headers, body: req.body, redirect: "manual" });
}
// Both loopback families, because the name resolves to ::1 as well as 127.0.0.1. Never 0.0.0.0.
for (const hostname of ["127.0.0.1", "::1"]) Bun.serve({ hostname, port: PORT, tls, fetch: forward, idleTimeout: 255 });
console.log(`https://${HOST}:${PORT} -> ${TARGET} (loopback only)`);
