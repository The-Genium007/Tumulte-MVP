#!/usr/bin/env node
/**
 * PWA Icon Generator
 * Generates all required PWA icons from the source SVG file
 */

/* eslint-disable @typescript-eslint/naming-convention */
/* global process */
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const sourceSvg = join(publicDir, "pwa-icon.svg");

// Icon configurations
const icons = [
  // Standard PWA icons
  { name: "pwa-64x64.png", size: 64 },
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },

  // Apple icons
  { name: "apple-touch-icon.png", size: 180 },

  // Favicons
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },

  // Shortcut icons
  { name: "shortcut-campaigns.png", size: 96 },
  { name: "shortcut-invitations.png", size: 96 },
];

// Apple splash screen configurations (portrait only for main devices)
const splashScreens = [
  // iPhone SE, iPod touch
  { name: "apple-splash-640-1136.png", width: 640, height: 1136 },
  // iPhone 8, 7, 6s, 6
  { name: "apple-splash-750-1334.png", width: 750, height: 1334 },
  // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
  { name: "apple-splash-1242-2208.png", width: 1242, height: 2208 },
  // iPhone X, XS, 11 Pro, 12 mini, 13 mini
  { name: "apple-splash-1125-2436.png", width: 1125, height: 2436 },
  // iPhone XR, 11
  { name: "apple-splash-828-1792.png", width: 828, height: 1792 },
  // iPhone XS Max, 11 Pro Max
  { name: "apple-splash-1242-2688.png", width: 1242, height: 2688 },
  // iPhone 12, 12 Pro, 13, 13 Pro, 14
  { name: "apple-splash-1170-2532.png", width: 1170, height: 2532 },
  // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
  { name: "apple-splash-1284-2778.png", width: 1284, height: 2778 },
  // iPhone 14 Pro
  { name: "apple-splash-1179-2556.png", width: 1179, height: 2556 },
  // iPhone 14 Pro Max
  { name: "apple-splash-1290-2796.png", width: 1290, height: 2796 },
  // iPad Mini, Air
  { name: "apple-splash-1536-2048.png", width: 1536, height: 2048 },
  // iPad Pro 10.5"
  { name: "apple-splash-1668-2224.png", width: 1668, height: 2224 },
  // iPad Pro 11"
  { name: "apple-splash-1668-2388.png", width: 1668, height: 2388 },
  // iPad Pro 12.9"
  { name: "apple-splash-2048-2732.png", width: 2048, height: 2732 },
];

async function generateIcon(svgBuffer, outputPath, size) {
  await sharp(svgBuffer)
    .resize(size, size, {
      fit: "contain",
      background: { r: 139, g: 92, b: 246, alpha: 1 }, // #8b5cf6
    })
    .png()
    .toFile(outputPath);

  console.log(`  Generated: ${outputPath.split("/").pop()}`);
}

async function generateSplashScreen(svgBuffer, outputPath, width, height) {
  // Calculate icon size (40% of the smallest dimension)
  const iconSize = Math.round(Math.min(width, height) * 0.4);

  // Create background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 3, g: 7, b: 18, alpha: 1 }, // #030712 (dark background)
    },
  })
    .png()
    .toBuffer();

  // Resize icon
  const icon = await sharp(svgBuffer)
    .resize(iconSize, iconSize, { fit: "contain" })
    .png()
    .toBuffer();

  // Composite icon on background (centered)
  await sharp(background)
    .composite([
      {
        input: icon,
        top: Math.round((height - iconSize) / 2),
        left: Math.round((width - iconSize) / 2),
      },
    ])
    .png()
    .toFile(outputPath);

  console.log(`  Generated: ${outputPath.split("/").pop()}`);
}

async function main() {
  console.log("PWA Icon Generator\n");

  // Check source file exists
  if (!existsSync(sourceSvg)) {
    console.error(`Error: Source SVG not found at ${sourceSvg}`);
    process.exit(1);
  }

  const svgBuffer = readFileSync(sourceSvg);

  // Generate standard icons
  console.log("Generating standard icons...");
  for (const icon of icons) {
    const outputPath = join(publicDir, icon.name);
    await generateIcon(svgBuffer, outputPath, icon.size);
  }

  // Generate splash screens
  console.log("\nGenerating Apple splash screens...");
  for (const splash of splashScreens) {
    const outputPath = join(publicDir, splash.name);
    await generateSplashScreen(svgBuffer, outputPath, splash.width, splash.height);
  }

  console.log("\nAll PWA icons generated successfully!");
}

main().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
