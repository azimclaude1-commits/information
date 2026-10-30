import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Windows and macOS resolve imports case-insensitively, and Vite tries `.ts` before `.tsx`.
 * Two script files whose names differ only by case (e.g. `fooModel.ts` + `FooModel.tsx`) therefore make
 * `import "./FooModel"` load the wrong file there and blank the app, while Linux works fine.
 */
function scriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return scriptFiles(path);
    return /\.(ts|tsx|js|jsx)$/.test(name) ? [path] : [];
  });
}

test("no two script files in a folder differ only by letter case", () => {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const file of [...scriptFiles("src"), ...scriptFiles("scripts")]) {
    const key = file.replace(/\.(ts|tsx|js|jsx)$/, "").toLowerCase();
    const other = seen.get(key);
    if (other) clashes.push(`${other} ↔ ${file}`);
    else seen.set(key, file);
  }
  assert.deepEqual(clashes, []);
});
