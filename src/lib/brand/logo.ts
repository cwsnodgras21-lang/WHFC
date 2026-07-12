import fs from "node:fs";
import path from "node:path";

/** True when public/branding/whfc-logo.png is present on disk. Server-only. */
export function brandLogoFileExists(): boolean {
  try {
    return fs.existsSync(
      path.join(process.cwd(), "public", "branding", "whfc-logo.png")
    );
  } catch {
    return false;
  }
}
