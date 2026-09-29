const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure icons dir exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to create uncompressed RGBA PNG
function createPng(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rowSize = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Adaptive
  ihdr[12] = 0; // Interlace: None
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcInput);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

// Minimalist Monochrome Icon Generator
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;

  // Rounded rectangle / badge background
  const cornerRadius = Math.max(2, Math.floor(w * 0.18));
  const inRect = (
    (x >= cornerRadius && x <= w - 1 - cornerRadius) ||
    (y >= cornerRadius && y <= h - 1 - cornerRadius) ||
    (Math.hypot(x - cornerRadius, y - cornerRadius) <= cornerRadius) ||
    (Math.hypot(x - (w - 1 - cornerRadius), y - cornerRadius) <= cornerRadius) ||
    (Math.hypot(x - cornerRadius, y - (h - 1 - cornerRadius)) <= cornerRadius) ||
    (Math.hypot(x - (w - 1 - cornerRadius), y - (h - 1 - cornerRadius)) <= cornerRadius)
  );

  if (!inRect) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Border check
  const isBorder = (
    x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
    Math.hypot(x - cornerRadius, y - cornerRadius) > cornerRadius - 1 && (x < cornerRadius && y < cornerRadius)
  );

  // Normalized coords [0, 1]
  const nx = x / w;
  const ny = y / h;

  // Minimalist Prompt Bolt / Slash symbol in center
  // Point 1: top-right (0.58, 0.20)
  // Point 2: mid-left (0.36, 0.52)
  // Point 3: mid-center (0.50, 0.52)
  // Point 4: bot-left (0.42, 0.80)
  // Point 5: bot-right (0.64, 0.44)
  // Point 6: mid-right (0.50, 0.44)

  const isBolt = (
    (nx >= 0.30 && nx <= 0.70 && ny >= 0.20 && ny <= 0.80) &&
    (
      // Upper diagonal
      (ny < 0.50 && nx >= 0.45 - (ny - 0.20) * 0.4 && nx <= 0.65 - (ny - 0.20) * 0.3) ||
      // Lower diagonal
      (ny >= 0.46 && nx >= 0.35 + (ny - 0.46) * 0.25 && nx <= 0.55 + (ny - 0.46) * 0.35)
    )
  );

  if (isBolt) {
    return [245, 245, 245, 255]; // Crisp white/light gray
  }

  if (isBorder) {
    return [60, 60, 66, 255]; // Subtle dark border
  }

  // Background: Dark textured charcoal
  return [22, 22, 24, 255];
}

// Generate 16, 48, 128
[16, 48, 128].forEach(size => {
  const pngBuffer = createPng(size, size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuffer);
  console.log(`Generated icon${size}.png`);
});
