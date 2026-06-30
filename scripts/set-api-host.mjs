#!/usr/bin/env node
/**
 * يحدّث public/app-config.json بعنوان IP الحالي للكمبيوتر على الشبكة المحلية.
 * الاستخدام: node scripts/set-api-host.mjs [IP] [PORT]
 * بدون IP: يطبع عناوين IPv4 المحلية ويختار أول عنوان غير loopback.
 */
import { networkInterfaces } from "node:os";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "public", "app-config.json");
const port = Number(process.argv[3]) || Number(process.env.PORT) || 3001;

const VIRTUAL_IFACE = /hyper-v|wsl|docker|vethernet|virtual|vmware|virtualbox|loopback|tailscale/i;

function listLocalIpv4() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    if (VIRTUAL_IFACE.test(name)) continue;
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        out.push({ name, address: net.address });
      }
    }
  }
  return out.sort((a, b) => scoreAddress(b.address) - scoreAddress(a.address));
}

/** يفضّل شبكة المنزل 192.168.x */
function scoreAddress(address) {
  if (address.startsWith("192.168.")) return 100;
  if (address.startsWith("10.")) return 50;
  if (address.startsWith("172.")) return 10;
  return 0;
}

let ip = process.argv[2]?.trim();

if (!ip) {
  const candidates = listLocalIpv4();
  if (candidates.length === 0) {
    console.error("لم يُعثر على عنوان IPv4 محلي. مرّر IP يدوياً: node scripts/set-api-host.mjs 192.168.1.50");
    process.exit(1);
  }
  ip = candidates[0].address;
  console.log("عناوين الشبكة المتاحة:");
  for (const c of candidates) {
    console.log(`  - ${c.address} (${c.name})${c.address === ip ? " ← مستخدم" : ""}`);
  }
}

const apiBaseUrl = `http://${ip}:${port}`;
const config = JSON.parse(readFileSync(configPath, "utf8"));
config.apiBaseUrl = apiBaseUrl;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

console.log(`\nتم التحديث: ${configPath}`);
console.log(`apiBaseUrl = ${apiBaseUrl}`);
console.log("\nللأندرويد: npm run mobile:sync  (أو غيّر العنوان من إعدادات التطبيق بدون إعادة بناء)");
