# postcss-penguinui

![CI](https://github.com/thesadzzad/postcss-penguinui/actions/workflows/ci.yml/badge.svg)

PostCSS plugin + CLI to compose and distribute small style “packages” as JSON and re-use them via `@package` / `@use` at-rules.

## Features

- `@package <name> as <alias>;` registers an alias for a JSON package in `penguinui/`.
- `@use <alias-or-name ...>;` injects declarations (multiple tokens allowed in one @use).
- Exactly one `@use` per CSS rule is allowed (later ones are ignored with a comment + warning).
- Unknown packages produce an inline comment and red error log (output CSS still builds).
- Duplicate alias (different target) produces an inline comment + warning; same target is ignored silently.
- CLI: generate JSON packages from CSS (`penguinui-generate`).
- CLI: manage packages (`penguinui add <url>`, `penguinui list`, `penguinui remove <name>`).
- Colored, concise console logging (info / success / yellow warn / red error).

## Best Uses

Use this plugin when you want to:

- Centrally curate a small, stable set of utility / component class declarations as portable JSON so multiple projects or build pipelines can share them.
- Ship pre-approved design tokens or low-level primitives (spacing, color, typography snippets) that get expanded at build time (no runtime cost / no custom property indirection needed).
- Gradually extract an existing utility CSS file into structured JSON packages without adopting a much larger framework.
- Enforce consistency: consumers can only pull predefined styles (no accidental divergence) via `@use`.
- Keep CSS build deterministic: injection order is explicit (single @use per rule) and multiple tokens expand in sequence.

Avoid or reconsider if you need:

- Highly dynamic, data-driven style generation (consider a CSS-in-JS or utility framework instead).
- Complex cascade / specificity orchestration (the injected declarations are appended verbatim; no layering logic besides rule order).
- Massive style sets where JSON duplication would bloat packages (consider design tokens + build transforms).
- Conditional styling at runtime (this operates strictly at build time).

## Installation

Install as a dev dependency (peer depends on PostCSS):

```bash
pnpm add -D postcss postcss-penguinui
# or
npm i -D postcss postcss-penguinui
```

## PostCSS Usage

### ESM (recommended)

```js
// postcss.config.js
import penguin from "postcss-penguinui";

export default {
  plugins: [penguin({ enableExperimental: false })],
};
```

### CommonJS

```js
// postcss.config.cjs
module.exports = {
  plugins: [require("postcss-penguinui")()],
};
```

### Minimal Example

Input CSS:

```css
@package example as button;
.btn {
  @use button;
}
```

`penguinui/example.json`:

```json
{
  "name": "example",
  "styles": { "opacity": "0.5", "color": "red" }
}
```

Transforms to:

```css
.btn {
  opacity: 0.5;
  color: red;
}
```

## JSON Package Schema

```json
{
  "name": "button",
  "styles": {
    "property": "value"
  }
}
```

## CLI Tools (Consumer-Facing)

Primary executable for consumers (usable with `npx` or local bin):

1. `penguinui` – manage local JSON packages: `add`, `list`, `remove`.

### Add a remote package

```bash
npx penguinui add https://example.com/button.json
# Saved to penguinui/button.json
```

### List installed packages

```bash
npx penguinui list
```

### Remove a package

```bash
npx penguinui remove button
```

## Developer Utility: Generator (Optional)

The `penguinui-generate` CLI is intended for maintainers authoring packages—not for end consumers.

### Generate packages from existing CSS

```bash
npx penguinui-generate path/to/css/ --out multiout
# Default output dir: multiout
```

### Generator Behavior

- Recursively scans provided files/directories for `*.css`.
- Extracts every class selector (comma-separated & complex selectors supported).
- Supports multiple classes per rule and merges duplicates (later wins).
- Emits one `<class>.json` file per class (matching schema). Default output: `multiout`.
- Safe to re-run; regenerated files overwrite previous output.

## Programmatic Use

```ts
import postcss from "postcss";
import penguin from "postcss-penguinui";

const result = await postcss([penguin({ enableExperimental: true })]).process(
  sourceCss,
  { from: undefined }
);
console.log(result.css);
```

## Development

Install deps & run tests:

```bash
pnpm install
pnpm test
```

### Commit Convention & Releases

Automated versioning and changelog generation use **semantic-release** with the Conventional Commits specification. Merge or push commits following:

```
feat: add new capability
fix: correct bug in @use expansion
chore: maintenance changes
docs: update README
refactor: internal refactor without behavior change
test: add or adjust tests
perf: performance improvement
```

The CI pipeline on `main` will:

1. Run lint & tests.
2. Analyze commits since last release.
3. Bump version (semver) & publish to npm (requires `NPM_TOKEN`).
4. Update `CHANGELOG.md` and create a GitHub release.

### Local Release Dry Run

You can preview the next release locally (will not publish):

```bash
npx semantic-release --dry-run --no-ci
```

### Contributing

1. Fork & branch from `main`.
2. Make changes + add tests.
3. Use a Conventional Commit message.
4. Open a PR; GitHub Actions will validate it.

## Warnings & Errors

Inline comments are inserted so the transformed CSS is self-explanatory. Console output (colored):

- Duplicate alias (different package): warning + comment.
- Second `@use` in a rule: warning + comment (ignored).
- Unknown package: error + comment.

Build is not aborted; you can treat errors as diagnostics during development.

## Roadmap

- Caching & watch mode for `penguinui/` folder.
- Optional prefix / namespacing utilities.
- Source maps for injected declarations.
- Update command (`penguinui add` smart overwrite / versioning).

## License

MIT – see `LICENSE`. Attribution required in all copies per the license text.
