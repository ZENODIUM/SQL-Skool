import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const outDir = path.join(process.cwd(), "docs", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

async function shot(name, url, waitForText) {
  console.log("capturing", name, url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (waitForText) {
    await page.getByText(waitForText).first().waitFor({ timeout: 45000 });
    // let animation settle one frame
    await page.waitForTimeout(1200);
  } else {
    await page.waitForTimeout(800);
  }
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
}

await shot("home", "http://localhost:3000/", "Keyword stories");
await shot(
  "story-join-trap",
  "http://localhost:3000/story/left-join-where-trap",
  "Intermediate result",
);
await shot("playground", "http://localhost:3000/playground", "Trace query");

await browser.close();
console.log("done");
