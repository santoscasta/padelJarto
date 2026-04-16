#!/usr/bin/env node
/**
 * Regenerate all PWA / favicon / social assets from a single 1024×1024 source PNG.
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
 *   src/app/opengraph-image.png     (1200×630 social preview, auto-detected
 *                                    by Next.js as og:image + twitter:image)
 *   src/app/twitter-image.png       (same 1200×630 image; Next.js uses it to
 *                                    emit twitter:card=summary_large_image)
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

async function openGraph(outputPath) {
  // 1200×630 is the canonical OG / Twitter large-card size. Compose the icon
  // on the left on a solid dark background with the wordmark + tagline as
  // vectorial SVG on the right so we don't depend on system fonts.
  const W = 1200;
  const H = 630;
  const iconSize = 360;
  const iconLeft = 120;
  const iconTop = (H - iconSize) / 2;

  const iconBuf = await sharp(SRC)
    .resize(iconSize, iconSize, { fit: 'cover' })
    .png()
    .toBuffer();

  const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .eyebrow {
      font: 700 24px "Barlow Condensed", "Inter", system-ui, sans-serif;
      letter-spacing: 6px;
      fill: #22D46A;
      text-transform: uppercase;
    }
    .title {
      font: 800 128px "Barlow Condensed", "Inter", system-ui, sans-serif;
      letter-spacing: -2px;
      fill: #F8FAFC;
      text-transform: uppercase;
    }
    .tagline {
      font: 500 34px "Inter", system-ui, sans-serif;
      fill: #B8BDC9;
    }
    .dot {
      fill: #22D46A;
    }
  </style>
  <circle class="dot" cx="548" cy="208" r="6" />
  <text class="eyebrow" x="565" y="217">APP PRIVADA</text>
  <text class="title" x="540" y="340">PADELJARTO</text>
  <text class="tagline" x="540" y="400">Torneos de padel entre amigos</text>
</svg>
  `);

  const buf = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: BG_HEX,
    },
  })
    .composite([
      { input: iconBuf, top: iconTop, left: iconLeft },
      { input: textSvg, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outputPath, buf);
  return { path: outputPath, size: `${W}×${H}`, kind: 'og' };
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

  const square = await Promise.all([
    simpleResize(192, path.join(root, 'public/icons/icon-192.png')),
    simpleResize(512, path.join(root, 'public/icons/icon-512.png')),
    maskable(512, path.join(root, 'public/icons/maskable-512.png')),
    simpleResize(180, path.join(root, 'public/apple-touch-icon.png')),
    simpleResize(32, path.join(root, 'public/favicon-32.png')),
    simpleResize(16, path.join(root, 'public/favicon-16.png')),
  ]);
  const og = await openGraph(path.join(root, 'src/app/opengraph-image.png'));
  // Twitter's summary_large_image uses the same framing.
  await writeFile(
    path.join(root, 'src/app/twitter-image.png'),
    await readFile(og.path),
  );

  for (const o of square) {
    const rel = path.relative(root, o.path);
    const tag = o.kind ? ` (${o.kind})` : '';
    console.log(`wrote ${rel} — ${o.size}×${o.size}${tag}`);
  }
  console.log(`wrote ${path.relative(root, og.path)} — ${og.size} (og)`);
  console.log(
    `wrote ${path.relative(root, path.join(root, 'src/app/twitter-image.png'))} — ${og.size} (twitter)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
