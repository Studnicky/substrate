#!/usr/bin/env node
/**
 * stamp-version.ts — rewrite every `docs/public/*.svg.template` into its
 * sibling `.svg` with the current `package.json#version` substituted for
 * `{{VERSION}}` and the logo data URI substituted for `{{LOGO_DATA_URI}}`.
 *
 * Usage:
 *   tsx scripts/stamp-version.ts            # write stamped .svg files + rasterize PNGs
 *   tsx scripts/stamp-version.ts --check    # exit non-zero if any stamped .svg is out of date
 *
 * --check validates text .svg files. STAMP_VERSION_REQUIRE_RASTER=true also
 * validates that PNG targets exist at the expected dimensions and that the
 * source SVGs render successfully.
 */

import { spawnSync } from 'node:child_process';
import { promises } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const PUBLIC_ROOT = join(REPO_ROOT, 'docs', 'public');
const BRAND_ROOT = join(REPO_ROOT, 'assets', 'brand');

const CHECK_MODE = process.argv.includes('--check');
const REQUIRE_RASTER_CHECK = process.env.STAMP_VERSION_REQUIRE_RASTER === 'true';

interface RasterTargetInterface {
  readonly 'height': number;
  readonly 'png': string;
  readonly 'svg': string;
  readonly 'width': number;
}

interface PngDimensionsInterface {
  readonly 'height': number;
  readonly 'width': number;
}

const pkgRaw = await promises.readFile(join(REPO_ROOT, 'package.json'), 'utf8');
const VERSION = (JSON.parse(pkgRaw) as { 'version': string }).version;

const logoRaw = await promises.readFile(join(BRAND_ROOT, 'logo-embed.png'));
const LOGO_DATA_URI = `data:image/png;base64,${logoRaw.toString('base64')}`;

const VERSION_RE = /\{\{VERSION\}\}/g;
const LOGO_RE = /\{\{LOGO_DATA_URI\}\}/g;
const TEMPLATE_SUFFIX_RE = /\.svg\.template$/;

async function findTemplates(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await promises.readdir(dir, { 'withFileTypes': true });

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined) {
      continue;
    }
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
const rasterTargets: readonly RasterTargetInterface[] = [
  { 'height': 630, 'png': join(PUBLIC_ROOT, 'og-image.png'), 'svg': join(PUBLIC_ROOT, 'og-image.svg'), 'width': 1200 },
  { 'height': 640, 'png': join(PUBLIC_ROOT, 'og-image-bare.png'), 'svg': join(PUBLIC_ROOT, 'og-image-bare.svg'), 'width': 1280 }
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let drift = 0;
let stamped = 0;

function readPngDimensions(buffer: Buffer): PngDimensionsInterface | null {
  if (buffer.length < 24 || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }

  return {
    'height': buffer.readUInt32BE(20),
    'width': buffer.readUInt32BE(16)
  };
}

class PngFileReader {
  public static async readOrNull(png: string): Promise<Buffer | null> {
    try {
      const currentPng = await promises.readFile(png);
      return currentPng;
    } catch {
      return null;
    }
  }
}

class SvgAccessChecker {
  public static async exists(svg: string): Promise<boolean> {
    try {
      await promises.access(svg);
      return true;
    } catch {
      return false;
    }
  }
}

class StampedTargetReader {
  public static async readOrEmpty(target: string): Promise<string> {
    try {
      const current = await promises.readFile(target, 'utf8');
      return current;
    } catch {
      return '';
    }
  }
}

async function runRasterCheck(rsvgPath: string, targets: readonly RasterTargetInterface[]): Promise<number> {
  let targetDrift = 0;
  const rasterTmp = await promises.mkdtemp(join(tmpdir(), 'substrate-raster-check.'));
  try {
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      if (target === undefined) {
        continue;
      }
      targetDrift += await checkRasterTarget(target, rsvgPath, rasterTmp);
    }
  } finally {
    await promises.rm(rasterTmp, { 'force': true, 'recursive': true });
  }
  return targetDrift;
}

async function checkRasterTarget(target: RasterTargetInterface, rsvgPath: string, rasterTmp: string): Promise<number> {
  const { height, png, svg, width } = target;
  const rendered = join(rasterTmp, `${relative(PUBLIC_ROOT, png).replaceAll('/', '-')}.check.png`);
  const result = spawnSync(rsvgPath, ['-w', String(width), '-h', String(height), svg, '-o', rendered], { 'encoding': 'utf8' });

  if (result.status !== 0) {
    console.error(`rsvg-convert failed for ${relative(REPO_ROOT, svg)}: ${result.stderr}`);
    return 1;
  }

  const currentPng = await PngFileReader.readOrNull(png);
  if (currentPng === null) {
    console.error(`✗ ${relative(REPO_ROOT, png)} is missing`);
    return 1;
  }

  const dimensions = readPngDimensions(currentPng);
  if (dimensions?.width !== width || dimensions?.height !== height) {
    console.error(`✗ ${relative(REPO_ROOT, png)} is not a ${width}×${height} PNG`);
    return 1;
  }

  console.log(`✓ ${relative(REPO_ROOT, png)} is ${width}×${height}; ${relative(REPO_ROOT, svg)} renders`);
  return 0;
}

for (let index = 0; index < templates.length; index += 1) {
  const template = templates[index];
  if (template === undefined) {
    continue;
  }
  const source = await promises.readFile(template, 'utf8');
  const stampedContent = source.replace(VERSION_RE, VERSION).replace(LOGO_RE, LOGO_DATA_URI);
  const target = template.replace(TEMPLATE_SUFFIX_RE, '.svg');

  if (CHECK_MODE) {
    const current = await StampedTargetReader.readOrEmpty(target);

    if (current !== stampedContent) {
      console.error(`✗ ${relative(REPO_ROOT, target)} is out of date relative to ${relative(REPO_ROOT, template)} at version ${VERSION}`);
      drift += 1;
    } else {
      console.log(`✓ ${relative(REPO_ROOT, target)} matches`);
    }
  } else {
    await promises.writeFile(target, stampedContent);
    console.log(`✓ stamped ${relative(REPO_ROOT, target)} @ ${VERSION}`);
    stamped += 1;
  }
}

if (CHECK_MODE) {
  const probe = spawnSync('which', ['rsvg-convert'], { 'encoding': 'utf8' });
  const rsvgPath = probe.status === 0 ? probe.stdout.trim() : null;

  if (rsvgPath === null) {
    const message = 'rsvg-convert not on PATH; PNG raster freshness was not checked.';
    if (REQUIRE_RASTER_CHECK) {
      console.error(message);
      process.exit(1);
    }
    console.warn(message);
  } else {
    drift += await runRasterCheck(rsvgPath, rasterTargets);
  }

  if (drift > 0) {
    console.error(`\n${drift} stamped artifact(s) drifted from their source files. Run \`pnpm run stamp-version\` and commit the result.`);
    process.exit(1);
  }
  console.log(`\nAll ${templates.length} stamped SVG(s) are in sync with version ${VERSION}.`);
} else {
  // Rasterize PNGs if rsvg-convert is available (write mode only). The committed
  // PNGs are the source artifact; environments without rsvg (e.g. CI) skip this
  // step and rely on the checked-in output.
  const probe = spawnSync('which', ['rsvg-convert'], { 'encoding': 'utf8' });
  const rsvgPath = probe.status === 0 ? probe.stdout.trim() : null;

  let rasterized = 0;

  if (rsvgPath === null) {
    console.log('rsvg-convert not on PATH — skipping PNG rasterization (using committed PNGs).');
  }

  if (rsvgPath !== null) {
    for (let index = 0; index < rasterTargets.length; index += 1) {
      const target = rasterTargets[index];
      if (target === undefined) {
        continue;
      }
      const { height, png, svg, width } = target;
      const svgExists = await SvgAccessChecker.exists(svg);
      if (!svgExists) {
        continue;
      }

      const result = spawnSync(rsvgPath, ['-w', String(width), '-h', String(height), svg, '-o', png], { 'encoding': 'utf8' });
      const errorCode = result.error !== undefined && 'code' in result.error ? result.error.code : undefined;

      if (errorCode === 'ENOENT') {
        console.log(`rsvg-convert not found at ${rsvgPath} — skipping PNG rasterization.`);
        break;
      } else if (result.status !== 0) {
        console.error(`rsvg-convert failed for ${relative(REPO_ROOT, svg)}: ${result.stderr}`);
      } else {
        console.log(`✓ rasterized ${relative(REPO_ROOT, png)} (${width}×${height})`);
        rasterized += 1;
      }
    }
  }

  console.log(`\nStamped ${stamped} SVG(s) at version ${VERSION}. PNGs rasterized: ${rasterized}.`);
}
