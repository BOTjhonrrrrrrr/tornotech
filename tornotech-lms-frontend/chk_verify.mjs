import { parse } from "@babel/parser";
import fs from "fs";
import path from "path";

function walk(dir, files=[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk("src");
let errors = 0;
for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  try {
    parse(code, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    errors++;
    console.log(`ERROR in ${f}: ${e.message}`);
  }
}
console.log(`Checked ${files.length} files, ${errors} syntax errors`);
