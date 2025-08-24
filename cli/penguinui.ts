#!/usr/bin/env node
import {
  writeFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  existsSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import https from "node:https";
import http from "node:http";
import { logger, formatPackageLine } from "../src/lib/logger.js";

interface Pkg {
  name: string;
  styles: Record<string, string>;
}

function usage(code = 0) {
  logger.info(
    `Usage: penguinui <command> [args]\n\nCommands:\n  add <url>        Download JSON package and save to penguinui/<name>.json\n  list             List installed penguinui packages\n  remove <name>    Remove installed package file penguinui/<name>.json`
  );
  process.exit(code);
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((res, rej) => {
    const lib = url.startsWith("https:") ? https : http;
    lib
      .get(url, (r) => {
        if (r.statusCode && r.statusCode >= 400) {
          rej(new Error("HTTP " + r.statusCode));
          return;
        }
        const chunks: Buffer[] = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => res(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", rej);
  });
}

function validate(json: unknown): asserts json is Pkg {
  if (!json || typeof json !== "object") throw new Error("Not an object");
  const obj = json as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim())
    throw new Error("Missing name");
  if (
    typeof obj.styles !== "object" ||
    obj.styles === null ||
    Array.isArray(obj.styles)
  )
    throw new Error("styles must be object");
  for (const [k, v] of Object.entries(obj.styles as Record<string, unknown>)) {
    if (typeof v !== "string")
      throw new Error(`Style value for ${k} must be string`);
  }
}

async function add(url: string) {
  const raw = await fetchUrl(url);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  validate(parsed);
  const dir = resolve(process.cwd(), "penguinui");
  mkdirSync(dir, { recursive: true });
  const pkg = parsed; // now typed via validate
  const file = resolve(dir, `${pkg.name}.json`);
  writeFileSync(file, JSON.stringify(pkg, null, 2), "utf8");
  logger.success(`Saved ${file}`);
}

function list() {
  const dir = resolve(process.cwd(), "penguinui");
  if (!existsSync(dir)) {
    logger.warn("No penguinui directory (nothing installed)");
    return;
  }
  const entries = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (!entries.length) {
    logger.warn("No packages installed");
    return;
  }
  for (const f of entries) {
    const fp = resolve(dir, f);
    let size = 0;
    try {
      size = statSync(fp).size;
    } catch {
      /* ignore */
    }
    logger.info(formatPackageLine(f.replace(/\.json$/, ""), size));
  }
}

function remove(name: string) {
  if (!name) throw new Error("Missing package name to remove");
  const dir = resolve(process.cwd(), "penguinui");
  const file = resolve(dir, `${name}.json`);
  if (!existsSync(file)) {
    throw new Error(`Package '${name}' not found`);
  }
  rmSync(file);
  logger.success(`Removed ${file}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--help")) usage(args.length ? 0 : 1);
  const cmd = args[0];
  try {
    if (cmd === "add") {
      if (args.length < 2) usage(1);
      await add(args[1]);
    } else if (cmd === "list") {
      list();
    } else if (cmd === "remove") {
      if (args.length < 2) usage(1);
      remove(args[1]);
    } else {
      usage(1);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(msg);
    process.exit(1);
  }
}

main();
