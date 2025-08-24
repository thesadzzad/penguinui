import type { AtRule, Rule } from "postcss";
import type { PackageMap } from "./readPackages.js";
import type { PackageAliasMap } from "./atPackage.js";
import { logger } from "./logger.js";

/**
 * Expand `@use <alias|name> ...;` inside a CSS rule by injecting package styles.
 * Supports multiple tokens in a single @use. Enforces only one @use per rule.
 */
// Track rules that have already consumed a @use to enforce single-use restriction.
const seenUseRules: WeakSet<Rule> = new WeakSet();

export default function handleAtUse(
  atRule: AtRule,
  packages: PackageMap,
  aliases: PackageAliasMap
) {
  const params = atRule.params.trim();
  const tokens = params.split(/\s+/).filter(Boolean);
  const parent = atRule.parent as Rule | undefined;
  if (!parent || parent.type !== "rule") {
    atRule.remove();
    return;
  }

  // Enforce single @use per rule.
  if (seenUseRules.has(parent)) {
    atRule.before({
      type: "comment",
      text: `penguinui: multiple @use not allowed in same rule (ignored '${tokens.join(
        " "
      )}')`,
    });
    logger.warn(
      `Multiple @use not allowed in same rule: ignored '${tokens.join(" ")}'.`
    );
    atRule.remove();
    return;
  }
  seenUseRules.add(parent);

  for (const token of tokens) {
    const pkgName = aliases[token] || token;
    const pkg = packages[pkgName];
    if (!pkg) {
      atRule.before({
        type: "comment",
        text: `penguinui: unknown package '${pkgName}' in @use`,
      });
      logger.error(`Unknown package in @use: '${pkgName}'.`);
      continue;
    }
    for (const [prop, value] of Object.entries(pkg.styles)) {
      parent.append({ prop, value });
    }
  }

  atRule.remove();
}
