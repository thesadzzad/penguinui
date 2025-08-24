/**
 * Minimal colored logger (no dependency) with graceful fallback when colors
 * aren't supported. Only used for developer feedback; does not affect output CSS.
 */
const supportsColor = process.stdout.isTTY || process.env.FORCE_COLOR === "1";

function color(code: string | number, str: string): string {
  const seq = typeof code === "number" ? String(code) : code;
  return supportsColor ? `\u001b[${seq}m${str}\u001b[0m` : str;
}

// Color tokens
const CYAN = "36";
const GREEN = "32";
const YELLOW_BOLD = "33;1";
const RED = "31";
const MAGENTA = "35";
const DIM = "90";

const tag = color(CYAN, "[penguinui]");

export const logger = {
  info(msg: string): void {
    // eslint-disable-next-line no-console
    console.log(tag, msg);
  },
  success(msg: string): void {
    // eslint-disable-next-line no-console
    console.log(tag, color(GREEN, msg));
  },
  warn(msg: string): void {
    // eslint-disable-next-line no-console
    console.warn(tag, color(YELLOW_BOLD, msg));
  },
  error(msg: string): void {
    // eslint-disable-next-line no-console
    console.error(tag, color(RED, msg));
  },
};

export function formatPackageLine(name: string, sizeBytes: number): string {
  const size = (sizeBytes / 1024).toFixed(1) + "kb";
  return `${color(MAGENTA, name)}\t${color(DIM, size)}`;
}
