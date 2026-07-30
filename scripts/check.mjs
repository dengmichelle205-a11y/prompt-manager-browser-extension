import { access, readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("manifest_version 必须为 3");
if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(manifest.version)) throw new Error("版本号格式无效");
const runtimeFiles = ["manifest.json", "options.html", "options.css", "mode.js", "options-core.js", "options-render.js", "options-tags.js", "options-events.js"];
for (const file of runtimeFiles) await access(path.join(root, file));
for (const icon of Object.values(manifest.icons || {})) await access(path.join(root, icon));
for (const file of ["mode.js", "options-core.js", "options-render.js", "options-tags.js", "options-events.js", "scripts/check.mjs", "scripts/package.mjs", "scripts/clean.mjs"]) {
  execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "inherit" });
}
const textFiles = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if ([".git", "dist", "node_modules"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(js|mjs|html|json|md|yml|yaml|css|svg)$/.test(entry.name)) textFiles.push(full);
  }
}
await walk(root);
for (const file of textFiles) {
  const content = await readFile(file, "utf8");
  if (/\beval\s*\(|new\s+Function\s*\(/.test(content)) throw new Error(`禁止动态代码执行：${path.relative(root,file)}`);
  if (/<script[^>]+src=["']https?:\/\//i.test(content)) throw new Error(`禁止远程脚本：${path.relative(root,file)}`);
  if (/(BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})/.test(content)) throw new Error(`疑似密钥：${path.relative(root,file)}`);
}
if ((manifest.permissions || []).some((p) => p !== "storage")) throw new Error("发现非预期权限");
if ((manifest.host_permissions || []).length) throw new Error("host_permissions 应为空");
console.log(`检查通过：Prompt Manager v${manifest.version}`);
