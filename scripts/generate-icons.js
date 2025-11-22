#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const sharp = require('sharp');

async function makeIcons(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const resBase = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  for (const [dir, size] of Object.entries(sizes)) {
    const outDir = path.join(resBase, dir);
    if (!fs.existsSync(outDir)) {
      console.warn(`Creating directory ${outDir}`);
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outLauncher = path.join(outDir, 'ic_launcher.png');
    const outLauncherRound = path.join(outDir, 'ic_launcher_round.png');

    try {
      await sharp(sourcePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile(outLauncher);

      // For round launcher we can apply simple circular mask if input is square; fallback to same as launcher
      // Create a circular transparency mask using SVG
      const circleSVG = `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`;
      const mask = Buffer.from(circleSVG);

      await sharp(sourcePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([{ input: mask, blend: 'dest-in' }])
        .toFile(outLauncherRound);
      console.log(`Wrote ${outLauncher} and ${outLauncherRound}`);
    } catch (err) {
      console.error(`Failed to write icons for ${dir}: ${err}`);
    }
  }
}

if (require.main === module) {
  const src = process.argv[2] || path.join(__dirname, '..', 'assets', 'logo_luca.png');
  makeIcons(src).catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

module.exports = makeIcons;
