import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Code-authored artwork. The cap follows the existing LANIS app symbol.
// Run: node scripts/generate-opengraph.mjs
const output = fileURLToPath(new URL('../public/', import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <title>Lanis — Das Schulportal Hessen, neu gedacht.</title>
  <rect width="1200" height="630" fill="#fcfcf9"/>
  <g transform="translate(378 168)">
    <rect width="144" height="144" rx="34" fill="#06b6d4"/>
    <g transform="scale(.144)" fill="#123446">
      <path d="M222 397 474 254Q500 239 526 254L806 416Q822 426 822 447V626Q822 655 794 655Q766 655 766 626V459L526 590Q500 606 474 590L222 451Q185 425 222 397Z"/>
      <path d="M294 548 471 649Q500 667 529 649L706 548V626Q706 666 676 684L529 769Q500 787 471 769L324 684Q294 666 294 626Z"/>
    </g>
  </g>
  <text x="552" y="284" font-family="Lato, sans-serif" font-size="126" font-weight="900" letter-spacing="-5" fill="#123446">Lanis</text>
  <text x="600" y="392" text-anchor="middle" font-family="Lato, sans-serif" font-size="38" font-weight="400" fill="#123446">Das Schulportal Hessen,</text>
  <text x="600" y="442" text-anchor="middle" font-family="Lato, sans-serif" font-size="38" font-weight="700" fill="#087e96">neu gedacht.</text>
</svg>\n`;

await writeFile(`${output}opengraph.svg`, svg);
await sharp(Buffer.from(svg)).flatten({ background: '#fcfcf9' }).png({ compressionLevel: 9 }).toFile(`${output}opengraph.png`);
const { width, height } = await sharp(`${output}opengraph.png`).metadata();
if (width !== 1200 || height !== 630) throw new Error('Unexpected Open Graph image dimensions');
console.log(`Generated ${output}opengraph.png (${width} × ${height})`);
