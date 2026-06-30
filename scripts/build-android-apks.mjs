#!/usr/bin/env node
/**
 * بناء debug + release APK في مجلد releases/
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const isWin = process.platform === "win32";
const version = "1.0.1";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, ...opts.env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function findApksigner(sdk) {
  const buildTools = join(sdk, "build-tools");
  if (!existsSync(buildTools)) return "";
  const versions = readdirSync(buildTools)
    .filter((n) => /^\d/.test(n))
    .sort();
  for (let i = versions.length - 1; i >= 0; i--) {
    const candidate = join(buildTools, versions[i], isWin ? "apksigner.bat" : "apksigner");
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

const variants = process.argv.includes("--release-only")
  ? ["release"]
  : process.argv.includes("--debug-only")
    ? ["debug"]
    : ["debug", "release"];

console.log("1/3 ضبط عنوان API...");
run("node", ["scripts/set-api-host.mjs"]);

console.log("2/3 بناء الويب و Capacitor sync...");
run(isWin ? "npm.cmd" : "npm", ["run", "mobile:sync"]);

const gradleTasks = variants.map((v) => `assemble${v[0].toUpperCase()}${v.slice(1)}`);
console.log(`3/3 Gradle ${gradleTasks.join(" + ")}...`);
run(isWin ? "gradlew.bat" : "./gradlew", [...gradleTasks, "--no-daemon"], {
  cwd: join(root, "android"),
});

const releasesDir = join(root, "releases");
mkdirSync(releasesDir, { recursive: true });
const built = [];

if (variants.includes("debug")) {
  const debugApk = join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
  if (!existsSync(debugApk)) {
    console.error("لم يُعثر على debug APK:", debugApk);
    process.exit(1);
  }
  const outDebug = join(releasesDir, `3yada-ai-${version}-debug.apk`);
  copyFileSync(debugApk, outDebug);
  built.push(outDebug);
}

if (variants.includes("release")) {
  const unsigned = join(
    root,
    "android/app/build/outputs/apk/release/app-release-unsigned.apk"
  );
  if (!existsSync(unsigned)) {
    console.error("لم يُعثر على release APK:", unsigned);
    process.exit(1);
  }
  const outUnsigned = join(releasesDir, `3yada-ai-${version}-release-unsigned.apk`);
  const outSigned = join(releasesDir, `3yada-ai-${version}-release-signed.apk`);
  copyFileSync(unsigned, outUnsigned);
  built.push(outUnsigned);

  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
  const apksigner = findApksigner(sdk);
  const keystore = join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".android/debug.keystore"
  );

  if (apksigner && existsSync(keystore)) {
    run(apksigner, [
      "sign",
      "--ks",
      keystore,
      "--ks-pass",
      "pass:android",
      "--key-pass",
      "pass:android",
      "--out",
      outSigned,
      outUnsigned,
    ]);
    built.push(outSigned);
  } else {
    console.warn("⚠️  release غير موقّع — apksigner غير متاح");
  }
}

console.log("\n✅ APK جاهزة:");
for (const p of built) console.log(" ", p);
