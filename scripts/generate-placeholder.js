#!/usr/bin/env node
const path = require('path');
const { Buffer } = require('buffer');
const sharp = require('sharp');

const outPath = path.join(__dirname, '..', 'assets', 'logo_luca.png');

async function makePlaceholder() {
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1E90FF"/> 
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 100}" fill="#ffffff" />
    <text x="50%" y="50%" font-size="380" text-anchor="middle" fill="#1E90FF" font-family="Arial, Helvetica, sans-serif" dy=".35em">L</text>
  </svg>`;

  const buffer = Buffer.from(svg);
  await sharp(buffer).png().toFile(outPath);
  console.log(`Wrote placeholder image to ${outPath}`);
}

if (require.main === module) {
  makePlaceholder().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = makePlaceholder;
