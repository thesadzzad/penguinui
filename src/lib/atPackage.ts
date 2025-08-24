import type { AtRule } from "postcss";
import type { PackageMap } from "./readPackages.js";
import { logger } from "./logger.js";

/**
 * Handle `@package <name> as <alias>;` declarations.
 * - Registers alias mapping if package exists.
 * - Emits a comment + warning for duplicate alias with different target.
 * - Emits a comment + error for unknown package names.
 */
export interface PackageAliasMap {
  [alias: string]: string;
}

export default function handleAtPackage(
  atRule: AtRule,
  packages: PackageMap,
  aliases: PackageAliasMap
) {
  const params = atRule.params.trim();
  const parts = params.split(/\s+/);

  // Only process exact 3-part syntax.
  if (!(parts.length === 3 && parts[1].toLowerCase() === "as")) {
    atRule.remove();
    return;
  }

  const [pkgName, , alias] = parts;
  const pkgExists = Boolean(packages[pkgName]);
  if (!pkgExists) {
    atRule.before({
      type: "comment",
      text: `penguinui: unknown package '${pkgName}'`,
    });
    logger.error(`Unknown package in @package: '${pkgName}'.`);
    atRule.remove();
    return;
  }

  const existing = aliases[alias];
  if (existing && existing !== pkgName) {
    atRule.before({
      type: "comment",
      text: `penguinui: alias '${alias}' already mapped to '${existing}' (ignored '${pkgName}')`,
    });
    logger.warn(
      `Alias '${alias}' already mapped to '${existing}' (ignored '${pkgName}').`
    );
    atRule.remove();
    return;
  }

  // Register alias if new.
  if (!existing) {
    aliases[alias] = pkgName;
  }

  atRule.remove();
}
