#!/usr/bin/env node
/**
 * stamp-version.mjs — rewrite every `docs/public/*.svg.template` into its
 * sibling `.svg` with the current `package.json#version` substituted for
 * `{{VERSION}}` and the logo data URI substituted for `{{LOGO_DATA_URI}}`.
 *
 * Usage:
 *   node scripts/stamp-version.mjs            # write stamped .svg files + rasterize PNGs
 *   node scripts/stamp-version.mjs --check    # exit non-zero if any stamped .svg is out of date
 *
 * --check validates text .svg files only; it does not touch PNGs or require rsvg.
 */

import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const PUBLIC_ROOT = join(REPO_ROOT, 'docs', 'public');
const BRAND_ROOT = join(REPO_ROOT, 'assets', 'brand');

const CHECK_MODE = process.argv.includes('--check');
const REQUIRE_RASTER_CHECK = process.env.STAMP_VERSION_REQUIRE_RASTER === 'true';

const pkgRaw = await fs.readFile(join(REPO_ROOT, 'package.json'), 'utf8');
const VERSION = JSON.parse(pkgRaw).version;

const logoRaw = await fs.readFile(join(BRAND_ROOT, 'logo-embed.png'));
const LOGO_DATA_URI = `data:image/png;base64,${logoRaw.toString('base64')}`;

const VERSION_RE = /\{\{VERSION\}\}/g;
const LOGO_RE = /\{\{LOGO_DATA_URI\}\}/g;

async function findTemplates(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...await findTemplates(full));
    } else if (entry.isFile() && entry.name.endsWith('.svg.template')) {
      out.push(full);
    }
  }

  return out;
}

const templates = await findTemplates(PUBLIC_ROOT);
const rasterTargets = [
  { svg: join(PUBLIC_ROOT, 'og-image.svg'), png: join(PUBLIC_ROOT, 'og-image.png'), width: 1200, height: 630 },
  { svg: join(PUBLIC_ROOT, 'og-image-bare.svg'), png: join(PUBLIC_ROOT, 'og-image-bare.png'), width: 1280, height: 640 }
];

let drift = 0;
let stamped = 0;

for (const template of templates) {
  const source = await fs.readFile(template, 'utf8');
  const stampedContent = source.replace(VERSION_RE, VERSION).replace(LOGO_RE, LOGO_DATA_URI);
  const target = template.replace(/\.svg\.template$/, '.svg');

  if (CHECK_MODE) {
    let current = '';

    try {
      current = await fs.readFile(target, 'utf8');
    } catch {
      // Missing target counts as drift.
    }

    if (current !== stampedContent) {
      console.error(`✗ ${relative(REPO_ROOT, target)} is out of date relative to ${relative(REPO_ROOT, template)} at version ${VERSION}`);
      drift += 1;
    } else {
      console.log(`✓ ${relative(REPO_ROOT, target)} matches`);
    }
  } else {
    await fs.writeFile(target, stampedContent);
    console.log(`✓ stamped ${relative(REPO_ROOT, target)} @ ${VERSION}`);
    stamped += 1;
  }
}

if (CHECK_MODE) {
  const probe = spawnSync('which', ['rsvg-convert'], { encoding: 'utf8' });
  const rsvgPath = probe.status === 0 ? probe.stdout.trim() : null;

  if (rsvgPath === null) {
    const message = 'rsvg-convert not on PATH; PNG raster freshness was not checked.';
    if (REQUIRE_RASTER_CHECK) {
      console.error(message);
      process.exit(1);
    }
    console.warn(message);
  } else {
    const rasterTmp = await fs.mkdtemp(join(tmpdir(), 'substrate-raster-check.'));
    try {
      for (const { svg, png, width, height } of rasterTargets) {
        const rendered = join(rasterTmp, `${relative(PUBLIC_ROOT, png).replaceAll('/', '-')}.check.png`);
        const result = spawnSync(rsvgPath, ['-w', String(width), '-h', String(height), svg, '-o', rendered], { encoding: 'utf8' });

        if (result.status !== 0) {
          console.error(`rsvg-convert failed for ${relative(REPO_ROOT, svg)}: ${result.stderr}`);
          drift += 1;
          continue;
        }

        let currentPng;
        let renderedPng;
        try {
          [currentPng, renderedPng] = await Promise.all([
            fs.readFile(png),
            fs.readFile(rendered)
          ]);
        } catch {
          console.error(`✗ ${relative(REPO_ROOT, png)} is missing`);
          drift += 1;
          continue;
        }

        if (!currentPng.equals(renderedPng)) {
          console.error(`✗ ${relative(REPO_ROOT, png)} is out of date relative to ${relative(REPO_ROOT, svg)}`);
          drift += 1;
        } else {
          console.log(`✓ ${relative(REPO_ROOT, png)} matches`);
        }
      }
    } finally {
      await fs.rm(rasterTmp, { force: true, recursive: true });
    }
  }

  if (drift > 0) {
    console.error(`\n${drift} stamped artifact(s) drifted from their source files. Run \`node scripts/stamp-version.mjs\` and commit the result.`);
    process.exit(1);
  }
  console.log(`\nAll ${templates.length} stamped SVG(s) are in sync with version ${VERSION}.`);
} else {
  // Rasterize PNGs if rsvg-convert is available (write mode only). The committed
  // PNGs are the source artifact; environments without rsvg (e.g. CI) skip this
  // step and rely on the checked-in output.
  const probe = spawnSync('which', ['rsvg-convert'], { encoding: 'utf8' });
  const rsvgPath = probe.status === 0 ? probe.stdout.trim() : null;

  let rasterized = 0;

  if (rsvgPath === null) {
    console.log('rsvg-convert not on PATH — skipping PNG rasterization (using committed PNGs).');
  }

  for (const { svg, png, width, height } of rsvgPath === null ? [] : rasterTargets) {
    try {
      await fs.access(svg);
    } catch {
      continue;
    }

    const result = spawnSync(rsvgPath, ['-w', String(width), '-h', String(height), svg, '-o', png], { encoding: 'utf8' });

    if (result.error?.code === 'ENOENT') {
      console.log(`rsvg-convert not found at ${rsvgPath} — skipping PNG rasterization.`);
      break;
    } else if (result.status !== 0) {
      console.error(`rsvg-convert failed for ${relative(REPO_ROOT, svg)}: ${result.stderr}`);
    } else {
      console.log(`✓ rasterized ${relative(REPO_ROOT, png)} (${width}×${height})`);
      rasterized += 1;
    }
  }

  console.log(`\nStamped ${stamped} SVG(s) at version ${VERSION}. PNGs rasterized: ${rasterized}.`);
}
