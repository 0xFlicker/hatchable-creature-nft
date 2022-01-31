import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { fstat, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import emoji from "node-emoji";
import cliProgress from "cli-progress";
import colors from "color-name";

const __dirname = dirname(fileURLToPath(import.meta.url));

GlobalFonts.registerFromPath(
  join(__dirname, "..", "fonts", "NotoColorEmoji.ttf"),
  "Noto Color Emoji"
);

const canvas = createCanvas(512, 512);
const ctx = canvas.getContext("2d");

/*
 * Generate test NFTs from emojis. These are only used for demonstrative purposes and should only be used for testing purposes.
 * The license of the emojis does not allow derivative for-profit use of the emojis.
 */

const numberToGenerate = Number(process.argv[2]) || 50;
console.log(`Generating ${numberToGenerate} test NFTs...`);

mkdirSync(join(__dirname, "..", "generated", "images"), { recursive: true });
mkdirSync(join(__dirname, "..", "generated", "metadata"), { recursive: true });

async function generateImage(text: string) {
  // clear the canvas
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "200px Noto Color Emoji";
  ctx.textAlign = "center";
  ctx.strokeText(text, 256, 256 + 100);
  const b = canvas.toBuffer("image/png");
  return b;
}
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
bar.start(numberToGenerate + 1, 0);

// Create egg image
const eggImage = await generateImage(emoji.get("egg"));
writeFileSync(join(__dirname, "..", "generated", "egg.png"), eggImage);
bar.update(1);

const allColors = Object.keys(colors) as (keyof typeof colors)[];
function sampleColors() {
  return allColors[Math.floor(Math.random() * allColors.length)];
}

for (let i = 1; i <= numberToGenerate; i++) {
  const name = `Test NFT ${i}`;
  const description = `This is a test NFT ${i}`;
  const randomEmoji = emoji.random();
  const randomColor = sampleColors();
  ctx.fillStyle = randomColor;
  const image = await generateImage(randomEmoji.emoji);
  writeFileSync(
    join(__dirname, "..", "generated", "images", `${i}.png`),
    image
  );
  const metadata = {
    name,
    description,
    image: `${i}.png`,
    attributes: [
      {
        trait_type: "keyword",
        value: randomEmoji.key,
      },
      {
        trait_type: "color",
        value: randomColor,
      },
    ],
  };
  writeFileSync(
    join(__dirname, "..", "generated", "metadata", `${i}`),
    JSON.stringify(metadata, null, 2)
  );
  bar.update(i + 1);
}

bar.stop();
