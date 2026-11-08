import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
const source = readFileSync("DESIGN.md", "utf8").split("---")[1];
const spec = parse(source);
const tokens: string[] = [];
for (const [group, prefix] of Object.entries({
  colors: "color",
  typography: "font",
  rounded: "radius",
  spacing: "space",
})) {
  for (const [key, value] of Object.entries(spec[group])) {
    tokens.push(
      `  --${prefix}-${key}: ${group === "typography" ? (value as { fontFamily: string }).fontFamily : value};`,
    );
  }
}
const css = `/* Generated from DESIGN.md. Run npm run tokens. */\n:root {\n${tokens.join("\n")}\n}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync("src/tokens.css", "utf8") !== css)
    throw new Error("Design tokens drifted. Run npm run tokens.");
} else writeFileSync("src/tokens.css", css);
