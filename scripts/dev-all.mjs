#!/usr/bin/env node
/**
 * تشغيل الويب + API + أندرويد (live reload) مع ضبط IP تلقائياً.
 * الاستخدام: npm run dev:all
 * للويب فقط: npm run dev
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const isWin = process.platform === "win32";

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    ...opts,
  });
}

console.log("═══ عيادة AI — تشغيل ويب + موبايل ═══\n");

const configProc = run("node", ["scripts/set-api-host.mjs"]);
configProc.on("close", (code) => {
  if (code !== 0) {
    console.warn("تحذير: تعذّر ضبط app-config.json تلقائياً — للموبايل المحلي شغّل: npm run config:host\n");
  }

  console.log("الويب:  http://localhost:5173");
  console.log("API:   public/app-config.json (للموبايل على الشبكة المحلية فقط)\n");

  const hasAndroid = existsSync(join(root, "android"));
  const children = [];

  children.push(run("npm", ["run", "dev:server"]));
  children.push(run("npm", ["run", "dev:client"]));

  if (hasAndroid) {
    console.log("أندرويد: live reload (يتطلب محاكي أو جهاز متصل)...\n");
    children.push(run("npx", ["cap", "run", "android", "-l", "--external"]));
  } else {
    console.log("مجلد android غير موجود — شغّل: npx cap add android\n");
  }

  const shutdown = () => {
    for (const c of children) {
      if (!c.killed) c.kill("SIGTERM");
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
