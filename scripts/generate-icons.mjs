/**
 * BreezeDock 图标生成脚本
 * 运行: node scripts/generate-icons.mjs
 *
 * 需要依赖: npm install -D sharp png-to-ico
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'src-tauri', 'icons');

const svgPath = join(iconsDir, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

async function generateIcons() {
  console.log('🎨 开始生成图标...\n');

  // 1. 生成 PNG
  console.log('📦 生成 PNG 图标...');
  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(join(iconsDir, name));
    console.log(`   ✅ ${name} (${size}x${size})`);
  }

  // 2. 生成 ICO (Windows 多尺寸)
  console.log('\n📦 生成 Windows ICO 图标...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoImages = await Promise.all(
    icoSizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100 })
        .toBuffer()
    )
  );

  // 使用 sharp 生成 ICO
  // ICO 格式：每个图像前有 6 字节头 + 16 字节目录项
  const icoBuffer = createIco(icoImages, icoSizes);
  writeFileSync(join(iconsDir, 'icon.ico'), icoBuffer);
  console.log('   ✅ icon.ico (多尺寸: 16/24/32/48/64/128/256)');

  // 3. 生成 NSIS 专用 BMP 头图
  console.log('\n📦 生成 NSIS 安装包图片...');

  // header.bmp (150x57)
  await sharp(svgBuffer)
    .resize(150, 57)
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const bmp = createBmp(data, info.width, info.height, 150, 57);
      writeFileSync(join(iconsDir, 'header.bmp'), bmp);
    });
  console.log('   ✅ header.bmp (150x57)');

  // sidebar.bmp (150x500)
  await sharp(svgBuffer)
    .resize(150, 500)
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const bmp = createBmp(data, info.width, info.height, 150, 500);
      writeFileSync(join(iconsDir, 'sidebar.bmp'), bmp);
    });
  console.log('   ✅ sidebar.bmp (150x500)');

  console.log('\n✨ 所有图标生成完成！');
}

function createIco(images, sizes) {
  // ICO 文件结构
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;

  let offset = headerSize + dirEntrySize * numImages;
  const offsets = [];

  for (const img of images) {
    offsets.push(offset);
    offset += img.length;
  }

  // 创建 header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type (1 = ICO)
  header.writeUInt16LE(numImages, 4); // Number of images

  // 创建目录项
  const dirEntries = [];
  for (let i = 0; i < numImages; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    const size = sizes[i];
    entry.writeUInt8(size === 256 ? 0 : size, 0);  // Width
    entry.writeUInt8(size === 256 ? 0 : size, 1);  // Height
    entry.writeUInt8(0, 2);                         // Color palette
    entry.writeUInt8(0, 3);                         // Reserved
    entry.writeUInt16LE(1, 4);                      // Color planes
    entry.writeUInt16LE(32, 6);                     // Bits per pixel
    entry.writeUInt32LE(images[i].length, 8);       // Size of image data
    entry.writeUInt32LE(offsets[i], 12);            // Offset to image data
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...images]);
}

function createBmp(rgbaData, origWidth, origHeight, targetWidth, targetHeight) {
  // BMP 文件头 (14 bytes) + DIB 头 (40 bytes) + 像素数据
  const rowSize = Math.ceil((targetWidth * 3) / 4) * 4; // 4-byte alignment
  const pixelDataSize = rowSize * targetHeight;
  const fileSize = 14 + 40 + pixelDataSize;

  const bmp = Buffer.alloc(fileSize);

  // BMP 文件头
  bmp.write('BM', 0);                    // Magic number
  bmp.writeUInt32LE(fileSize, 2);        // File size
  bmp.writeUInt32LE(0, 6);               // Reserved
  bmp.writeUInt32LE(54, 10);             // Pixel data offset

  // DIB 头 (BITMAPINFOHEADER)
  bmp.writeUInt32LE(40, 14);              // DIB header size
  bmp.writeInt32LE(targetWidth, 18);     // Width
  bmp.writeInt32LE(targetHeight, 22);    // Height
  bmp.writeUInt16LE(1, 26);              // Color planes
  bmp.writeUInt16LE(24, 28);             // Bits per pixel (RGB)
  bmp.writeUInt32LE(0, 30);              // Compression (none)
  bmp.writeUInt32LE(pixelDataSize, 34);  // Image size
  bmp.writeInt32LE(2835, 38);            // X pixels per meter
  bmp.writeInt32LE(2835, 42);            // Y pixels per meter
  bmp.writeUInt32LE(0, 46);              // Colors in color table
  bmp.writeUInt32LE(0, 50);              // Important colors

  // 像素数据 (BGR format, bottom-up)
  let offset = 54;
  for (let y = targetHeight - 1; y >= 0; y--) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * origWidth / targetWidth);
      const srcY = Math.floor(y * origHeight / targetHeight);
      const srcIdx = (srcY * origWidth + srcX) * 4;

      // BMP 使用 BGR 顺序
      bmp.writeUInt8(rgbaData[srcIdx + 2], offset++); // B
      bmp.writeUInt8(rgbaData[srcIdx + 1], offset++); // G
      bmp.writeUInt8(rgbaData[srcIdx], offset++);     // R
    }
    // Padding
    const padding = rowSize - targetWidth * 3;
    for (let p = 0; p < padding; p++) {
      bmp.writeUInt8(0, offset++);
    }
  }

  return bmp;
}

generateIcons().catch(console.error);
