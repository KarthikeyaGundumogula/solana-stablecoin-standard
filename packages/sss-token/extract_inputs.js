const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "src", "generated", "instructions");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts");

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), "utf8");
  // Handle optional generics and match the type definition
  const match = content.match(
    /export type \w+Input(?:<[^>]*>)? = \{([\s\S]*?)\};/,
  );

  if (match) {
    console.log(`\n========== ${file} ==========`);
    console.log(match[0].trim());
  }
}
