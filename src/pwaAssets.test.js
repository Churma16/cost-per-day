import fs from 'node:fs';
import path from 'node:path';

const publicDirectory = path.resolve(process.cwd(), 'public');

const readPngMetadata = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');

  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${filePath} is not a PNG file`);
  }

  let offset = 8;
  let width = null;
  let height = null;
  const chunks = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);

    chunks.push(type);

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
    }

    offset += 12 + length;

    if (type === 'IEND') {
      break;
    }
  }

  return { width, height, chunks };
};

describe('PWA manifest icons', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDirectory, 'manifest.json'), 'utf8')
  );

  const pngIcons = manifest.icons.filter((icon) => icon.type === 'image/png');

  test.each(pngIcons)('$src exists, matches its declared dimensions, and uses browser-safe metadata', (icon) => {
    const filePath = path.join(publicDirectory, icon.src);
    expect(fs.existsSync(filePath)).toBe(true);

    const metadata = readPngMetadata(filePath);
    const declaredSizes = icon.sizes
      .split(/\s+/)
      .map((size) => size.split('x').map(Number));

    expect(declaredSizes).toContainEqual([metadata.width, metadata.height]);

    // The Worthwhile branding rollout introduced embedded iCCP profiles that
    // coincided with Chromium rejecting installation. Keep install icons
    // metadata-simple and deterministic.
    expect(metadata.chunks).not.toContain('iCCP');
  });
});
