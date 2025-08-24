import test from "node:test";
import assert from "node:assert/strict";
import postcss from "postcss";
import plugin from "../src/index.js";

async function transform(css: string) {
  return postcss([plugin()]).process(css, { from: undefined });
}

test("duplicate alias same package: no conflict comment", async () => {
  const input = `@package example as btn;\n@package example as btn;\n.btn { @use btn; }`;
  const result = await transform(input);
  const out = result.css.trim();
  assert.match(out, /\.btn\s*{[\s\S]*opacity: 0\.5;/);
  assert.doesNotMatch(out, /alias 'btn' already mapped/);
});

test("duplicate alias different package: emits conflict comment once", async () => {
  const input = `@package example as x;\n@package other as x;\n.x { @use x; }`;
  const result = await transform(input);
  const out = result.css.trim();
  assert.match(
    out,
    /alias 'x' already mapped to 'example' \(ignored 'other'\)/
  );
  assert.match(out, /\.x\s*{[\s\S]*opacity: 0\.5;/); // got example styles
});

test("unknown package in @package and @use: both comments appear", async () => {
  const input = `@package missing as ghost;\n.ghost { @use ghost; }`;
  const result = await transform(input);
  const out = result.css.trim();
  assert.match(out, /unknown package 'missing'/);
  assert.match(out, /unknown package 'ghost' in @use/);
});

test("multi-token single @use merges styles in order and handles unknown", async () => {
  const input = `@package example as btn;\n@package other as box;\n.mix { @use btn box nope; }`;
  const result = await transform(input);
  const out = result.css.trim();
  // example then other styles; color overridden by blue
  assert.match(out, /opacity: 0\.5;/);
  assert.match(out, /margin: 1rem;/);
  assert.match(out, /color: blue;/); // final color
  assert.match(out, /unknown package 'nope' in @use/);
});

test("second @use in same rule ignored with comment", async () => {
  const input = `@package example as btn;\n@package other as box;\n.multi { @use btn; @use box; }`;
  const result = await transform(input);
  const out = result.css.trim();
  // Should have example styles only once, and a comment about multiple @use
  assert.match(out, /multiple @use not allowed/);
  const opacityMatches = out.match(/opacity: 0\.5;/g) || [];
  assert.equal(opacityMatches.length, 1);
});
