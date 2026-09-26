import fs from 'node:fs';
import path from 'node:path';

const projectDirectory = process.cwd();
const publicDirectory = path.resolve(projectDirectory, 'public');
const manifestFileName = 'manifest-v2.json';

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

describe('PWA install assets', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDirectory, manifestFileName), 'utf8')
  );

  test('HTML references cache-busted PWA identity assets', () => {
    const html = fs.readFileSync(path.join(projectDirectory, 'index.html'), 'utf8');

    expect(html).toContain('href="/worthwhile-favicon-v2.ico"');
    expect(html).toContain('href="/worthwhile-icon-192-v2.png"');
    expect(html).toContain('href="/manifest-v2.json"');
    expect(html).not.toContain('href="/manifest.json"');
    expect(html).toContain('<meta name="theme-color" content="#334A5B" />');
  });

  test('manifest has an explicit root identity and standalone scope', () => {
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#334A5B');
    expect(manifest.background_color).toBe('#000000');
  });

  const pngIcons = manifest.icons.filter((icon) => icon.type === 'image/png');

  test('manifest only references versioned PNG install icons', () => {
    expect(pngIcons.map((icon) => icon.src)).toEqual([
      '/worthwhile-icon-192-v2.png',
      '/worthwhile-icon-256-v2.png',
      '/worthwhile-icon-512-v2.png',
    ]);
    expect(pngIcons.every((icon) => icon.purpose === 'any')).toBe(true);
    expect(pngIcons.some((icon) => icon.sizes.includes('192x192'))).toBe(true);
    expect(pngIcons.some((icon) => icon.sizes.includes('512x512'))).toBe(true);
  });

  test.each(pngIcons)(
    '$src exists, matches its declared dimensions, and uses browser-safe metadata',
    (icon) => {
      const filePath = path.join(publicDirectory, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);

      const metadata = readPngMetadata(filePath);
      const declaredSizes = icon.sizes
        .split(/\s+/)
        .map((size) => size.split('x').map(Number));

      expect(declaredSizes).toContainEqual([metadata.width, metadata.height]);
      expect(metadata.chunks).not.toContain('iCCP');
    }
  );
});
