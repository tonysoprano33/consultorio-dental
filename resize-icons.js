const sharp = require('sharp');
const fs = require('fs');

const inputImagePath = 'C:/Users/Tony/.gemini/antigravity/brain/26564302-aedf-439a-aa22-0c0ecd568258/tooth_logo_1776042452545.png';

async function main() {
  // PWA Icons
  if (!fs.existsSync('./public/icons')) fs.mkdirSync('./public/icons', { recursive: true });
  
  await sharp(inputImagePath).resize(192, 192).toFile('./public/icons/icon-192x192.png');
  await sharp(inputImagePath).resize(512, 512).toFile('./public/icons/icon-512x512.png');
  await sharp(inputImagePath).resize(180, 180).toFile('./public/icons/apple-touch-icon.png');
  await sharp(inputImagePath).resize(96, 96).toFile('./public/icons/badge-96x96.png');
  
  // Next.js App Router Icons
  await sharp(inputImagePath).resize(32, 32).toFile('./src/app/favicon.ico');
  await sharp(inputImagePath).resize(180, 180).toFile('./src/app/apple-icon.png');
  await sharp(inputImagePath).resize(192, 192).toFile('./src/app/icon.png');

  console.log("Images generated successfully!");
}

main().catch(console.error);
