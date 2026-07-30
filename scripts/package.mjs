import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const outDir = path.join(root, "dist");
const outFile = path.join(outDir, `prompt-manager-v${manifest.version}.zip`);
const include = ["manifest.json", "mode.js", "options.html", "options.css", "options-core.js", "options-render.js", "options-tags.js", "options-events.js", "icons"];
const files = [];
async function collect(rel) {
  const full = path.join(root, rel);
  const entries = await readdir(full, { withFileTypes: true }).catch(() => null);
  if (!entries) { files.push(rel.replaceAll(path.sep,"/")); return; }
  for (const entry of entries) await collect(path.join(rel, entry.name));
}
for (const item of include) await collect(item);
files.sort();
let crcTable;
function crc32(buf) {
  if (!crcTable) crcTable = Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  let c=0xffffffff; for (const b of buf) c=crcTable[(c^b)&0xff]^(c>>>8); return (c^0xffffffff)>>>0;
}
function u16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n);return b;} function u32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b;}
const locals=[], centrals=[]; let offset=0;
for (const rel of files) {
  const name=Buffer.from(rel); const data=await readFile(path.join(root,rel)); const compressed=deflateRawSync(data,{level:9}); const crc=crc32(data);
  const local=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(8),u16(0),u16(33),u32(crc),u32(compressed.length),u32(data.length),u16(name.length),u16(0),name,compressed]);
  locals.push(local);
  const central=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(8),u16(0),u16(33),u32(crc),u32(compressed.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
  centrals.push(central); offset+=local.length;
}
const centralSize=centrals.reduce((n,b)=>n+b.length,0);
const end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(offset),u16(0)]);
await mkdir(outDir,{recursive:true}); await writeFile(outFile,Buffer.concat([...locals,...centrals,end]));
console.log(`已生成 ${path.relative(root,outFile)}（${files.length} 个文件）`);
