import type { Plugin, PluginCreator, AtRule } from "postcss";
import type { PenguinUIOptions } from "./types/options.js";
import readPackages from "./lib/readPackages.js";
import handleAtPackage, { type PackageAliasMap } from "./lib/atPackage.js";
import handleAtUse from "./lib/atUse.js";

/**
 * postcss-penguinui
 * Provides custom at-rules:
 * - @package <name> as <alias>;
 * - @use <alias|name> [...];
 * Injects declarations from JSON-defined style packages under ./penguinui.
 */

const creator: PluginCreator<PenguinUIOptions> = (
  opts: PenguinUIOptions = {}
) => {
  // Normalize options (reserved for future use)
  const enableExperimental = Boolean(opts.enableExperimental);

  const plugin: Plugin = {
    postcssPlugin: "postcss-penguinui",
    Once(root) {
      const packages = readPackages();
      const aliases: PackageAliasMap = {};
      // First pass: collect @package declarations
      root.walkAtRules("package", (at: AtRule) =>
        handleAtPackage(at, packages, aliases)
      );
      // Second pass: expand @use occurrences
      root.walkAtRules("use", (at: AtRule) =>
        handleAtUse(at, packages, aliases)
      );
      // Future experimental hooks could go here.
      if (enableExperimental) {
        // placeholder to avoid unused var lint until implemented
      }
    },
  };
  return plugin;
};

creator.postcss = true;

export default creator;
export { creator as plugin };
