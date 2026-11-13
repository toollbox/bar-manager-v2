import { describe, expect, it } from "vitest";
import { defaultTheme, getTheme, isThemeId, themes } from "./themes";

function luminance(hex: string) {
  const rgb = hex
    .match(/[\da-f]{2}/gi)!
    .map((part) => parseInt(part, 16) / 255)
    .map((part) =>
      part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("theme preferences", () => {
  it("rejects unsupported preferences and safely resolves missing values", () => {
    for (const value of [
      undefined,
      null,
      "",
      "neon",
      "constructor",
      { theme: "cobalt" },
    ]) {
      expect(isThemeId(value)).toBe(false);
      expect(getTheme(value).id).toBe(defaultTheme);
    }
    expect(isThemeId("midnight-brass")).toBe(true);
  });

  for (const theme of themes) {
    it(`${theme.name} keeps normal text, buttons, and status messages readable`, () => {
      const v = theme.variables;
      for (const [text, background] of [
        [v["--foreground"], v["--surface"]],
        [v["--foreground"], v["--background"]],
        [v["--muted-foreground"], v["--surface"]],
        [v["--muted-foreground"], v["--background"]],
        [v["--primary-foreground"], v["--primary"]],
        [v["--accent-foreground"], v["--accent"]],
        [v["--success"], v["--success-soft"]],
        [v["--warning"], v["--warning-soft"]],
        [v["--danger"], v["--danger-soft"]],
      ])
        expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
