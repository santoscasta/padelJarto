#!/usr/bin/env node
/**
 * Regenerate all PWA / favicon assets from a single 1024×1024 source PNG.
 *
 *   node scripts/generate-icons.mjs
 *
 * Inputs:
 *   public/icons/icon-source.png  (1024×1024 master, full-bleed square)
 *
 * Outputs:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/maskable-512.png   (ball rescaled to 80% on bg #0D1017 for
 *                                    Android adaptive-icon safe zone)
 *   public/apple-touch-icon.png     (180×180 for iOS home-screen)
 *   public/favicon-32.png
 *   public/favicon-16.png
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const SRC = path.join(root, 'public/icons/icon-source.png');
const BG_HEX = '#0D1017';

async function simpleResize(size, outputPath) {
  const buf = await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outputPath, buf);
  return { path: outputPath, size };
}

async function maskable(size, outputPath) {
  // Android adaptive icons clip to a shape that lives in the inner 80% of the
  // canvas. We resize the source to 80% and composite it on a full-bleed solid
  // background matching the source's dark ink, so the OS-applied mask never
  // clips the ball.
  const inner = Math.round(size * 0.8);
  const pad = Math.round((size - inner) / 2);
  const resized = await sharp(SRC)
    .resize(inner, inner, { fit: 'cover' })
    .png()
    .toBuffer();
  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG_HEX,
    },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outputPath, buf);
  return { path: outputPath, size, kind: 'maskable' };
}

async function main() {
  const srcBuf = await readFile(SRC).catch(() => null);
  if (!srcBuf) {
    console.error(`Source not found: ${SRC}`);
    process.exit(1);
  }
  const meta = await sharp(srcBuf).metadata();
  if (meta.width !== 1024 || meta.height !== 1024) {
    console.error(
      `Source must be 1024×1024 (got ${meta.width}×${meta.height}). Re-export from ChatGPT.`,
    );
    process.exit(1);
  }

  const outputs = await Promise.all([
    simpleResize(192, path.join(root, 'public/icons/icon-192.png')),
    simpleResize(512, path.join(root, 'public/icons/icon-512.png')),
    maskable(512, path.join(root, 'public/icons/maskable-512.png')),
    simpleResize(180, path.join(root, 'public/apple-touch-icon.png')),
    simpleResize(32, path.join(root, 'public/favicon-32.png')),
    simpleResize(16, path.join(root, 'public/favicon-16.png')),
  ]);

  for (const o of outputs) {
    const rel = path.relative(root, o.path);
    const tag = o.kind ? ` (${o.kind})` : '';
    console.log(`wrote ${rel} — ${o.size}×${o.size}${tag}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
