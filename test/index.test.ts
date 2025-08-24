import test from "node:test";
import assert from "node:assert/strict";
import postcss from "postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import plugin from "../src/index.js";

// Always resolve fixtures from workspace root so compiled dist tests still find them.
const rootDir = process.cwd();
const inputCss = readFileSync(join(rootDir, "test", "input.css"), "utf8");
const outputCss = readFileSync(join(rootDir, "test", "output.css"), "utf8");

async function run(
  input: string,
  output: string,
  opts: Parameters<typeof plugin>[0] = {}
) {
  const result = await postcss([plugin(opts)]).process(input, {
    from: undefined,
  });
  assert.equal(result.css.trim(), output.trim());
  assert.equal(result.warnings().length, 0);
}

test("passes through CSS unchanged by default (file fixtures)", async () => {
  await run(inputCss, outputCss);
});

test("experimental option does not change output yet (file fixtures)", async () => {
  await run(inputCss, outputCss, { enableExperimental: true });
});

// Big integration test
const bigInput = readFileSync(join(rootDir, "test", "big-input.css"), "utf8");
const bigOutput = readFileSync(join(rootDir, "test", "big-output.css"), "utf8");

test("big integration: packages, aliases, duplicates, multiple uses", async () => {
  const result = await postcss([plugin()]).process(bigInput, {
    from: undefined,
  });
  assert.equal(result.css.trim(), bigOutput.trim());
});
