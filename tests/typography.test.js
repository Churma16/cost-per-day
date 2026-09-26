import fs from 'node:fs';
import path from 'node:path';

const projectDirectory = process.cwd();

const readProjectFile = (filePath) =>
  fs.readFileSync(path.resolve(projectDirectory, filePath), 'utf8');

describe('Worthwhile typography', () => {
  const html = readProjectFile('index.html');
  const indexCss = readProjectFile('src/index.css');
  const tailwindConfig = readProjectFile('tailwind.config.js');

  test('loads Inter centrally with the full supported weight range and swap behavior', () => {
    expect(html).toContain(
      'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap'
    );
    expect(html).not.toContain('Orbitron');
  });

  test('uses Inter as the shared UI stack while preserving monospace content', () => {
    expect(indexCss).toContain(
      "font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
    );
    expect(indexCss).not.toContain(
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    );
    expect(indexCss).toMatch(
      /\.react-datepicker\s*\{[^}]*font-family:\s*inherit !important;/s
    );
    expect(indexCss).toMatch(/code\s*\{[^}]*monospace;/s);
  });

  test('aligns Tailwind sans utilities with Inter and removes Orbitron configuration', () => {
    expect(tailwindConfig).toContain(
      "sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '\"Segoe UI\"', 'sans-serif']"
    );
    expect(tailwindConfig).not.toContain('orbitron');
    expect(tailwindConfig).not.toContain('Orbitron');
  });
});
