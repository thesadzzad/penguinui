#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readdirSync,
} from "node:fs";
import { resolve, extname } from "node:path";
import postcss, { Rule, Declaration, Root } from "postcss";
import { logger } from "../src/lib/logger.js";

interface PackageJSON {
  name: string;
  styles: Record<string, string>;
}

function extractClassNames(selector: string): string[] {
  // Split on commas first
  const parts = selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const classes: string[] = [];
  for (const part of parts) {
    // Find all class tokens in the selector (ignore pseudos/attributes)
    const regex = /\.([_a-zA-Z0-9-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(part))) {
      classes.push(m[1]);
    }
  }
  return [...new Set(classes)];
}

function extract(root: Root): PackageJSON[] {
  const map: Record<string, Record<string, string>> = {};
  root.walkRules((rule: Rule) => {
    if (!rule.selector.includes(".")) return;
    const classNames = extractClassNames(rule.selector);
    if (classNames.length === 0) return;
    // Gather declarations for this rule
    const decls: Record<string, string> = {};
    rule.walkDecls((d: Declaration) => {
      decls[d.prop] = d.value;
    });
    if (Object.keys(decls).length === 0) return;
    for (const cls of classNames) {
      map[cls] = { ...(map[cls] || {}), ...decls }; // merge/override
    }
  });
  return Object.entries(map).map(([name, styles]) => ({ name, styles }));
}

function usage(exit = 0) {
  logger.info(
    `Usage: penguinui-generate <file-or-dir> [more ...] [--out <dir>]`
  );
  logger.info(
    `Converts every *.css file found into JSON files (one per class).`
  );
  logger.info(`- Supports multiple class selectors per rule (e.g. .a, .b)`);
  logger.info(
    `- Merges duplicate class declarations across files (later wins)`
  );
  logger.info(`Default output directory: multiout`);
  process.exit(exit);
}

function collectCssPaths(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    try {
      const st = statSync(p);
      if (st.isDirectory()) {
        const entries = readdirSync(p);
        for (const e of entries) {
          const full = resolve(p, e);
          try {
            const est = statSync(full);
            if (est.isDirectory()) {
              out.push(...collectCssPaths([full]));
            } else if (extname(full) === ".css") {
              out.push(full);
            }
          } catch {
            /* ignore */
          }
        }
      } else if (extname(p) === ".css") {
        out.push(p);
      }
    } catch {
      /* ignore missing */
    }
  }
  return out;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0 || rawArgs.includes("--help"))
    usage(rawArgs.length === 0 ? 1 : 0);
  let outDir = "multiout";
  const inputPaths: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === "--out") {
      outDir = rawArgs[++i] || outDir;
      continue;
    }
    inputPaths.push(resolve(process.cwd(), a));
  }
  const cssFiles = collectCssPaths(inputPaths);
  if (cssFiles.length === 0) {
    logger.error("No CSS files found.");
    process.exit(2);
  }
  const outAbs = resolve(process.cwd(), outDir);
  mkdirSync(outAbs, { recursive: true });
  let totalPkgs = 0;
  for (const filePath of cssFiles) {
    const css = readFileSync(filePath, "utf8");
    const root = postcss.parse(css);
    const packages = extract(root);
    for (const pkg of packages) {
      const outFile = resolve(outAbs, `${pkg.name}.json`);
      writeFileSync(outFile, JSON.stringify(pkg, null, 2), "utf8");
      logger.info(`Wrote ${outFile}`);
      totalPkgs++;
    }
  }
  if (totalPkgs === 0) {
    logger.warn("No class rules with declarations found in any CSS file.");
    process.exit(3);
  }
}

main().catch((e) => {
  logger.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
