import fs from "fs";
import path from "path";

const appDir = path.join(process.cwd(), "app");

function walk(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Show directory
      console.log(prefix + entry.name + "/");

      // Recurse
      walk(fullPath, prefix + "  ");
    } else if (entry.isFile()) {
      // Show file
      console.log(prefix + entry.name);
    }
  }
}

console.log("📦 APP ROUTE TREE\n");
walk(appDir);
