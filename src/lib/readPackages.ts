import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export interface PenguinPackage {
  name: string;
  styles: Record<string, string>;
  path: string;
}

export interface PackageMap {
  [name: string]: PenguinPackage;
}

/**
 * Recursively read all JSON files under the penguinui directory in project root
 * and build a map keyed by package name.
 */
export default function readPackages(
  rootDir: string = process.cwd()
): PackageMap {
  const packagesDir = resolve(rootDir, "penguinui");
  const map: PackageMap = {};
  let entries: string[] = [];
  try {
    entries = readdirSync(packagesDir);
  } catch {
    return map; // directory missing -> empty map
  }
  for (const entry of entries) {
    const full = join(packagesDir, entry);
    if (statSync(full).isDirectory()) {
      // skip subdirs for now (could recurse later)
      continue;
    }
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = readFileSync(full, "utf8");
      const data = JSON.parse(raw);
      if (
        data &&
        typeof data.name === "string" &&
        typeof data.styles === "object"
      ) {
        map[data.name] = { name: data.name, styles: data.styles, path: full };
      }
    } catch {
      // ignore malformed json
      continue;
    }
  }
  return map;
}
