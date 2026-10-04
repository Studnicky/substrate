
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = join(repositoryRoot, 'docs/public/diagrams');

const diagrams = [
  { 'name': 'architecture-package-families', 'source': 'docs/diagrams/architecture-package-families.mmd' },
  { 'name': 'architecture-fsm-overview', 'source': 'docs/diagrams/architecture-fsm-overview.mmd' },
  { 'name': 'dependency-graph', 'source': 'docs/diagrams/dependency-graph.mmd' }
];

const themes = [
  {
    'background': '#ffffff',
    'name': 'light',
    'themeVariables': { 'background': '#ffffff', 'lineColor': '#94a3b8', 'primaryBorderColor': '#7c5aed', 'primaryColor': '#f5f3ff', 'primaryTextColor': '#2e1065', 'secondaryColor': '#faf5ff', 'tertiaryColor': '#f8fafc', 'textColor': '#334155' }
  },
  {
    'background': '#1b1b1f',
    'name': 'dark',
    'themeVariables': { 'background': '#1b1b1f', 'lineColor': '#64748b', 'primaryBorderColor': '#a78bfa', 'primaryColor': '#312e81', 'primaryTextColor': '#f5f3ff', 'secondaryColor': '#3b0764', 'tertiaryColor': '#1e293b', 'textColor': '#e2e8f0' }
  }
];

/**
 * Runs one diagram-rendering command and rejects when its process exits unsuccessfully.
 *
 * @param {string} command Executable name.
 * @param {string[]} arguments_ Command arguments.
 * @returns {Promise<void>} Process completion.
 */
function run(command: string, arguments_: string[]): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, arguments_, { 'cwd': repositoryRoot, 'stdio': 'inherit' });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'substrate-mermaid-'));
await mkdir(outputDirectory, { 'recursive': true });

try {
  for (const diagram of diagrams) {
    const input = join(repositoryRoot, diagram.source);

    for (const theme of themes) {
      const config = join(temporaryDirectory, `${diagram.name}.${theme.name}.json`);
      const output = join(outputDirectory, `${diagram.name}.${theme.name}.svg`);
      await writeFile(config, `${JSON.stringify({
        'flowchart': { 'htmlLabels': false, 'nodeSpacing': 28, 'rankSpacing': 44, 'useMaxWidth': true },
        'handDrawnSeed': 0,
        'securityLevel': 'strict',
        'theme': 'base',
        'themeVariables': theme.themeVariables
      }, null, 2)}\n`);
      await run('pnpm', ['exec', 'mmdc', '--backgroundColor', theme.background, '--configFile', config, '--input', input, '--output', output]);
    }
  }
} finally {
  await rm(temporaryDirectory, { 'force': true, 'recursive': true });
}
