import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

const entrypoints = new Map([
  ['fetch', 'packages/fetch/src/browser/index.ts'],
  ['file-lock', 'packages/file-lock/src/browser/index.ts'],
  ['logger', 'packages/logger/src/index.ts'],
  ['request-executor', 'packages/request-executor/src/index.ts'],
  ['store', 'packages/store/src/browser/index.ts'],
  ['system', 'packages/system/src/browser/index.ts'],
  ['timing', 'packages/timing/src/browser/index.ts'],
  ['virtual-fs', 'packages/virtual-fs/src/browser/index.ts'],
  ['worker-pool', 'packages/worker-pool/src/browser/index.ts']
]);

for (const [packageName, entry] of entrypoints) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'substrate-browser-entrypoint-'));
  const outputDirectory = join(temporaryDirectory, 'output');
  const configPath = join(temporaryDirectory, 'vite.config.mjs');
  const config = {
    'build': {
      'lib': {
        'entry': resolve(entry),
        'formats': ['es'],
        'name': `Substrate${packageName}`
      },
      'outDir': outputDirectory
    }
  };

  try {
    await writeFile(configPath, `export default ${JSON.stringify(config)};\n`);
    await executeFile('pnpm', ['exec', 'vite', 'build', '--config', configPath], { 'cwd': process.cwd() });
    const outputFiles = await readdir(outputDirectory);

    for (const outputFile of outputFiles) {
      const code = await readFile(join(outputDirectory, outputFile), 'utf8');
      if (/(?:node:|node_modules\/node:)/u.test(code)) {
        throw new Error(`${packageName} browser entrypoint includes a Node builtin`);
      }
    }
  } finally {
    await rm(temporaryDirectory, { 'force': true, 'recursive': true });
  }
}

console.log(`browser-entrypoints: OK (${String(entrypoints.size)} checked)`);
