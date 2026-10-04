import { globSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ExampleSmokeRunner } from './ExampleSmokeRunner.js';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PACKAGE_FILTER = process.env.EXAMPLE_SMOKE_PACKAGE ?? '';
const SCENARIO_PATHS = globSync('packages/*/tests/smoke/examples.scenarios.json', { 'cwd': ROOT_DIR })
  .toSorted()
  .filter((scenarioPath) => {
    return PACKAGE_FILTER === '' || scenarioPath.startsWith(`packages/${PACKAGE_FILTER}/`);
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false;
}

function requireRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (isRecord(value) === false) {
    throw new Error(`Example smoke scenario ${label} must be an object`);
  }
  return value;
}

function requireString(record: Readonly<Record<string, unknown>>, property: string, label: string): string {
  const value = record[property];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Example smoke scenario ${label} requires a non-empty ${property}`);
  }
  return value;
}

function normalizeImportScenario(record: Readonly<Record<string, unknown>>, scenarioDirectory: string, label: string, entrypoint: string): unknown {
  const description = requireString(record, 'description', label);
  const name = requireString(record, 'name', label);
  const file = entrypoint.startsWith('.') ? entrypoint : relative(scenarioDirectory, resolve(scenarioDirectory, '../../examples', entrypoint));
  return {
    'description': description,
    'expected': { 'importsWithoutThrow': true },
    'input': { 'file': file.split('\\').join('/') },
    'name': name,
    'shape': 'imports-example'
  };
}

function normalizeExamplesRootScenario(record: Readonly<Record<string, unknown>>, scenarioDirectory: string, label: string): unknown[] {
  const expected = requireRecord(record.expected, `${label}.expected`);
  if (expected.importsWithoutThrow !== true) {
    throw new Error(`Example smoke scenario ${label} requires expected.importsWithoutThrow to be true`);
  }
  const input = requireRecord(record.input, `${label}.input`);
  const examplesRoot = resolve(scenarioDirectory, requireString(input, 'examplesRoot', `${label}.input`));
  const description = requireString(record, 'description', label);
  const name = requireString(record, 'name', label);
  const files = globSync('*.ts', { 'cwd': examplesRoot }).toSorted();
  if (files.length === 0) {
    throw new Error(`Example smoke scenario ${label} resolves no TypeScript examples`);
  }
  return files.map((file) => {
    const examplePath = relative(scenarioDirectory, resolve(examplesRoot, file)).split('\\').join('/');
    return {
      'description': description,
      'expected': { 'importsWithoutThrow': true },
      'input': { 'file': examplePath },
      'name': `${name}: ${file}`,
      'shape': 'imports-example'
    };
  });
}

interface ScenarioNormalizerFunctionInterface {
  (scenario: unknown, scenarioDirectory: string, label: string): unknown[];
}

function retainCanonicalScenario(scenario: unknown): unknown[] {
  return [scenario];
}

function normalizeImportShapeScenario(scenario: unknown, scenarioDirectory: string, label: string): unknown[] {
  const record = requireRecord(scenario, label);
  const input = requireRecord(record.input, `${label}.input`);
  const entrypoint = input.file ?? input.entrypoint;
  if (typeof entrypoint !== 'string' || entrypoint.length === 0) {
    throw new Error(`Example smoke scenario ${label} requires input.file or input.entrypoint`);
  }
  if (input.file !== undefined && record.expected !== undefined) {
    return [scenario];
  }
  return [normalizeImportScenario(record, scenarioDirectory, label, entrypoint)];
}

function normalizeSmokeShapeScenario(scenario: unknown, scenarioDirectory: string, label: string): unknown[] {
  const record = requireRecord(scenario, label);
  const input = requireRecord(record.input, `${label}.input`);
  const entrypoint = requireString(input, 'entrypoint', `${label}.input`);
  return [normalizeImportScenario(record, scenarioDirectory, label, entrypoint)];
}

function normalizeExamplesRootShapeScenario(scenario: unknown, scenarioDirectory: string, label: string): unknown[] {
  return normalizeExamplesRootScenario(requireRecord(scenario, label), scenarioDirectory, label);
}

const SCENARIO_NORMALIZERS: ReadonlyMap<string, ScenarioNormalizerFunctionInterface> = new Map([
  ['browser-example', retainCanonicalScenario],
  ['examples-smoke', normalizeExamplesRootShapeScenario],
  ['imports-example', normalizeImportShapeScenario],
  ['smoke', normalizeSmokeShapeScenario],
  ['worker-entry', retainCanonicalScenario]
]);

function normalizeScenario(scenario: unknown, scenarioDirectory: string, label: string): unknown[] {
  const shape = requireString(requireRecord(scenario, label), 'shape', label);
  const normalize = SCENARIO_NORMALIZERS.get(shape);
  if (normalize === undefined) {
    throw new Error(`Example smoke scenario ${label} has unsupported shape '${shape}'`);
  }
  return normalize(scenario, scenarioDirectory, label);
}

if (SCENARIO_PATHS.length === 0) {
  throw new Error(`No example smoke scenarios match package selector '${PACKAGE_FILTER}'`);
}

for (const scenarioPath of SCENARIO_PATHS) {
  const packageName = scenarioPath.split('/')[1];
  if (packageName === undefined) {
    throw new Error(`Cannot determine package for example smoke scenario '${scenarioPath}'`);
  }
  const scenarioFilePath = resolve(ROOT_DIR, scenarioPath);
  const scenarioDirectory = dirname(scenarioFilePath);
  const scenarioFile = requireRecord(JSON.parse(readFileSync(scenarioFilePath, 'utf8')), scenarioPath);
  const cases = scenarioFile.cases;
  if (!Array.isArray(cases)) {
    throw new Error(`Example smoke scenario file ${scenarioPath} requires cases`);
  }
  const normalizedCases = cases.flatMap((scenario, index) => {
    return normalizeScenario(scenario, scenarioDirectory, `${scenarioPath} cases[${index}]`);
  });
  ExampleSmokeRunner.registerExampleSmokeSuite({ 'cases': normalizedCases }, {
    'packageName': packageName,
    'specUrl': pathToFileURL(scenarioFilePath).href
  });
}
