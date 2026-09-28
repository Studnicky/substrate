import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  type CompilerHost,
  type CompilerOptions,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isTypeAliasDeclaration,
  ModuleKind,
  type ModuleDeclaration,
  ModuleResolutionKind,
  ScriptKind,
  ScriptTarget,
  type SourceFile
} from 'typescript';

import { TypeContractClassification } from '../../src/rules/shared/TypeContractClassification.js';
import scenarioGroups from './TypeContractClassification.scenarios.json' with { type: 'json' };

const packageRoot = resolve(import.meta.dirname, '../..');
const virtualRoot = resolve(packageRoot, '.type-contract-classification');

const compilerOptions: CompilerOptions = {
  allowImportingTsExtensions: true,
  module: ModuleKind.NodeNext,
  moduleResolution: ModuleResolutionKind.NodeNext,
  skipLibCheck: true,
  strict: true,
  target: ScriptTarget.ESNext
};

function createFixture(sources: ReadonlyMap<string, string>) {
  const files = new Map<string, string>();
  sources.forEach((source, filename) => {
    files.set(resolve(virtualRoot, filename), source);
  });

  const baseHost = createCompilerHost(compilerOptions);
  const host: CompilerHost = {
    ...baseHost,
    directoryExists: (directory) => {
      const normalized = resolve(directory);
      const virtualDirectory = [...files.keys()].some((filename) => {
        return filename.startsWith(`${normalized}/`);
      });
      return virtualDirectory || baseHost.directoryExists?.(directory) === true;
    },
    fileExists: (filename) => {
      return files.has(resolve(filename)) || baseHost.fileExists(filename);
    },
    getSourceFile: (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
      const source = files.get(resolve(filename));
      if (source !== undefined) {
        return createSourceFile(filename, source, languageVersion, true, ScriptKind.TS);
      }
      return baseHost.getSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile);
    },
    readFile: (filename) => {
      return files.get(resolve(filename)) ?? baseHost.readFile(filename);
    }
  };

  return createProgram({
    host,
    options: compilerOptions,
    rootNames: [...files.keys()]
  });
}

function sourceFile(program: ReturnType<typeof createFixture>, filename = 'root.ts'): SourceFile {
  const source = program.getSourceFile(resolve(virtualRoot, filename));
  if (source === undefined) {
    throw RuntimeError.create(`Missing fixture source: ${filename}`);
  }
  return source;
}

function alias(program: ReturnType<typeof createFixture>, name: string, filename = 'root.ts') {
  const declaration = sourceFile(program, filename).statements.find((statement) => {
    return isTypeAliasDeclaration(statement) && statement.name.text === name;
  });
  if (declaration === undefined || !isTypeAliasDeclaration(declaration)) {
    throw RuntimeError.create(`Missing type alias: ${name}`);
  }
  return declaration;
}

function namespaceAlias(
  program: ReturnType<typeof createFixture>,
  namespaceName: string,
  aliasName: string,
  filename = 'root.ts'
): NonNullable<ReturnType<typeof alias>> {
  const namespaceDeclaration = sourceFile(program, filename).statements.find(
    (statement): statement is ModuleDeclaration => {
      return isModuleDeclaration(statement) && statement.name.text === namespaceName;
    }
  );
  const namespaceBody = namespaceDeclaration?.body;
  if (namespaceBody === undefined || !isModuleBlock(namespaceBody)) {
    throw RuntimeError.create(`Missing namespace body: ${namespaceName}`);
  }
  const declaration = namespaceBody.statements.find((statement) => {
    return isTypeAliasDeclaration(statement) && statement.name.text === aliasName;
  });
  if (declaration === undefined || !isTypeAliasDeclaration(declaration)) {
    throw RuntimeError.create(`Missing namespace type alias: ${namespaceName}.${aliasName}`);
  }
  return declaration;
}

function interfaceDeclaration(program: ReturnType<typeof createFixture>, name: string) {
  const declaration = sourceFile(program).statements.find((statement) => {
    return isInterfaceDeclaration(statement) && statement.name.text === name;
  });
  if (declaration === undefined || !isInterfaceDeclaration(declaration)) {
    throw RuntimeError.create(`Missing interface: ${name}`);
  }
  return declaration;
}

function programFromFiles(files: Record<string, string>): ReturnType<typeof createFixture> {
  return createFixture(new Map(Object.entries(files)));
}

function assertAliasOutcome(
  program: ReturnType<typeof createFixture>,
  name: string,
  expected: {
    classification?: string;
    evidence?: boolean;
    fixable?: boolean;
    reason?: string;
    readonlyReasons?: readonly string[];
  }
): void {
  const actual = TypeContractClassification.forProgram(program).analyzeAlias(alias(program, name));
  if (expected.classification !== undefined) {
    assert.equal(actual.classification, expected.classification, name);
  }
  if (expected.reason !== undefined) {
    assert.equal(actual.reason, expected.reason, name);
  }
  if (expected.evidence) {
    assert.ok(actual.evidence.pos >= 0, name);
  }
  if (expected.readonlyReasons !== undefined) {
    assert.deepEqual(
      actual.readonlyOutput.map((entry) => { return entry.reason; }),
      expected.readonlyReasons,
      name
    );
  }
  if (expected.fixable !== undefined) {
    assert.equal(actual.readonlyOutput[0]?.fixable, expected.fixable, name);
  }
}

function assertInterfaceOutcome(
  program: ReturnType<typeof createFixture>,
  name: string,
  expected: { classification?: string; reason?: string }
): void {
  const actual = TypeContractClassification.forProgram(program).analyzeInterface(interfaceDeclaration(program, name));
  if (expected.classification !== undefined) {
    assert.equal(actual.classification, expected.classification, name);
  }
  if (expected.reason !== undefined) {
    assert.equal(actual.reason, expected.reason, name);
  }
}

type ScenarioCase =
  | {
      expected: { classification: string; reason: string };
      input: { aliasName: string; files: Record<string, string>; namespaceName: string };
      shape: 'entity-direct';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ classification: string; name: string; reason?: string }>;
      };
      input: { files: Record<string, string> };
      shape: 'composition-provenance';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ classification: string; name: string; reason?: string }>;
      };
      input: { files: Record<string, string> };
      shape: 'owner-direct';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ classification?: string; evidence?: boolean; fixable?: boolean; name: string; reason?: string; readonlyReasons?: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      shape: 'alias-cycles';
      name: string;
    }
  | {
      expected: {
        assertions: {
          intrinsic: Array<{ classification: string; fixable: false; name: string; readonlyReasons: readonly string[]; reason: string }>;
          shadowed: Array<{ name: string; readonlyReasons: readonly string[] }>;
        };
      };
      input: {
        programs: {
          intrinsic: Record<string, string>;
          shadowed: Record<string, string>;
        };
      };
      shape: 'readonly-intrinsics';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ fixable?: boolean; name: string; readonlyReasons: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      shape: 'explicit-readonly';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ fixable?: boolean; name: string; readonlyReasons: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      shape: 'exposed-defaults';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ name: string; readonlyReasons?: readonly string[] }>;
        excluded: readonly string[];
      };
      input: { files: Record<string, string> };
      shape: 'readonly-exclusions';
      name: string;
    }
  | {
      expected: {
        assertions: Array<{ fixable?: boolean; name: string; readonlyReasons: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      shape: 'readonly-indirection';
      name: string;
    }
  | {
      expected: {
        aliasAssertions: Array<{ classification?: string; name: string; reason?: string; readonlyReasons?: readonly string[] }>;
        interfaceAssertions: Array<{ classification?: string; name: string; reason?: string }>;
      };
      input: { files: Record<string, string> };
      shape: 'interface-matrix';
      name: string;
    };

const SCENARIO_SHAPES = new Set(['entity-direct', 'composition-provenance', 'owner-direct', 'alias-cycles', 'readonly-intrinsics', 'explicit-readonly', 'exposed-defaults', 'readonly-exclusions', 'readonly-indirection', 'interface-matrix']);

function isScenarioShape(value: unknown): value is ScenarioCase['shape'] {
  return typeof value === 'string' && SCENARIO_SHAPES.has(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isReadonlyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isOptionalReadonlyStringArray(value: unknown): value is readonly string[] | undefined {
  return value === undefined || isReadonlyStringArray(value);
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return Predicates.isObject(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function intakeFiles(raw: unknown): Record<string, string> {
  if (!isRecordOfStrings(raw)) {
    throw new TypeError(`malformed TypeContractClassification files map: ${JSON.stringify(raw)}`);
  }
  return raw;
}

function intakeFilesInput(raw: unknown): { files: Record<string, string> } {
  if (!Predicates.isObject(raw)) {
    throw new TypeError(`malformed TypeContractClassification input: ${JSON.stringify(raw)}`);
  }
  return { 'files': intakeFiles(raw.files) };
}

function intakeAssertionArray<T>(raw: unknown, intakeOne: (entry: unknown) => T): T[] {
  if (!Array.isArray(raw)) {
    throw new TypeError(`malformed TypeContractClassification assertions array: ${JSON.stringify(raw)}`);
  }
  return raw.map(intakeOne);
}

function intakeRequiredAssertion(raw: unknown): { classification: string; name: string; reason?: string } {
  if (!Predicates.isObject(raw) || typeof raw.classification !== 'string' || typeof raw.name !== 'string' || !isOptionalString(raw.reason)) {
    throw new TypeError(`malformed TypeContractClassification assertion: ${JSON.stringify(raw)}`);
  }
  return {
    'classification': raw.classification,
    'name': raw.name,
    ...(raw.reason === undefined ? {} : { 'reason': raw.reason })
  };
}

function intakeCycleAssertion(raw: unknown): { classification?: string; evidence?: boolean; fixable?: boolean; name: string; reason?: string; readonlyReasons?: readonly string[] } {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isOptionalString(raw.classification) || !isOptionalString(raw.reason) || !isOptionalBoolean(raw.fixable) || !isOptionalBoolean(raw.evidence) || !isOptionalReadonlyStringArray(raw.readonlyReasons)) {
    throw new TypeError(`malformed TypeContractClassification cycle assertion: ${JSON.stringify(raw)}`);
  }
  return {
    ...(raw.classification === undefined ? {} : { 'classification': raw.classification }),
    ...(raw.evidence === undefined ? {} : { 'evidence': raw.evidence }),
    ...(raw.fixable === undefined ? {} : { 'fixable': raw.fixable }),
    'name': raw.name,
    ...(raw.reason === undefined ? {} : { 'reason': raw.reason }),
    ...(raw.readonlyReasons === undefined ? {} : { 'readonlyReasons': raw.readonlyReasons })
  };
}

function intakeReadonlyAssertion(raw: unknown): { fixable?: boolean; name: string; readonlyReasons: readonly string[] } {
  if (!Predicates.isObject(raw) || !isOptionalBoolean(raw.fixable) || typeof raw.name !== 'string' || !isReadonlyStringArray(raw.readonlyReasons)) {
    throw new TypeError(`malformed TypeContractClassification readonly assertion: ${JSON.stringify(raw)}`);
  }
  return {
    ...(raw.fixable === undefined ? {} : { 'fixable': raw.fixable }),
    'name': raw.name,
    'readonlyReasons': raw.readonlyReasons
  };
}

function intakeExclusionAssertion(raw: unknown): { name: string; readonlyReasons?: readonly string[] } {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isOptionalReadonlyStringArray(raw.readonlyReasons)) {
    throw new TypeError(`malformed TypeContractClassification exclusion assertion: ${JSON.stringify(raw)}`);
  }
  return {
    'name': raw.name,
    ...(raw.readonlyReasons === undefined ? {} : { 'readonlyReasons': raw.readonlyReasons })
  };
}

function intakeIntrinsicAssertion(raw: unknown): { classification: string; fixable: false; name: string; readonlyReasons: readonly string[]; reason: string } {
  if (!Predicates.isObject(raw) || typeof raw.classification !== 'string' || raw.fixable !== false || typeof raw.name !== 'string' || !isReadonlyStringArray(raw.readonlyReasons) || typeof raw.reason !== 'string') {
    throw new TypeError(`malformed TypeContractClassification intrinsic assertion: ${JSON.stringify(raw)}`);
  }
  return {
    'classification': raw.classification,
    'fixable': raw.fixable,
    'name': raw.name,
    'readonlyReasons': raw.readonlyReasons,
    'reason': raw.reason
  };
}

function intakeShadowedAssertion(raw: unknown): { name: string; readonlyReasons: readonly string[] } {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isReadonlyStringArray(raw.readonlyReasons)) {
    throw new TypeError(`malformed TypeContractClassification shadowed assertion: ${JSON.stringify(raw)}`);
  }
  return { 'name': raw.name, 'readonlyReasons': raw.readonlyReasons };
}

function intakeInterfaceAssertion(raw: unknown): { classification?: string; name: string; reason?: string } {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isOptionalString(raw.classification) || !isOptionalString(raw.reason)) {
    throw new TypeError(`malformed TypeContractClassification interface assertion: ${JSON.stringify(raw)}`);
  }
  return {
    ...(raw.classification === undefined ? {} : { 'classification': raw.classification }),
    'name': raw.name,
    ...(raw.reason === undefined ? {} : { 'reason': raw.reason })
  };
}

function intakeAliasAssertion(raw: unknown): { classification?: string; name: string; reason?: string; readonlyReasons?: readonly string[] } {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isOptionalString(raw.classification) || !isOptionalString(raw.reason) || !isOptionalReadonlyStringArray(raw.readonlyReasons)) {
    throw new TypeError(`malformed TypeContractClassification alias assertion: ${JSON.stringify(raw)}`);
  }
  return {
    ...(raw.classification === undefined ? {} : { 'classification': raw.classification }),
    'name': raw.name,
    ...(raw.reason === undefined ? {} : { 'reason': raw.reason }),
    ...(raw.readonlyReasons === undefined ? {} : { 'readonlyReasons': raw.readonlyReasons })
  };
}

type ScenarioPayloadIntake = (name: string, rawInput: unknown, rawExpected: unknown) => ScenarioCase;

// One payload validator per discriminant; the shape selects which fixture contract runs, never a cast.
const SCENARIO_PAYLOAD_INTAKE: Record<ScenarioCase['shape'], ScenarioPayloadIntake> = {
  'alias-cycles': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed alias-cycles expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeCycleAssertion) },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'alias-cycles'
    };
  },
  'composition-provenance': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed composition-provenance expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeRequiredAssertion) },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'composition-provenance'
    };
  },
  'entity-direct': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawInput) || typeof rawInput.aliasName !== 'string' || typeof rawInput.namespaceName !== 'string') {
      throw new TypeError(`malformed entity-direct input: ${JSON.stringify(rawInput)}`);
    }
    if (!Predicates.isObject(rawExpected) || typeof rawExpected.classification !== 'string' || typeof rawExpected.reason !== 'string') {
      throw new TypeError(`malformed entity-direct expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'classification': rawExpected.classification, 'reason': rawExpected.reason },
      'input': { 'aliasName': rawInput.aliasName, 'files': intakeFiles(rawInput.files), 'namespaceName': rawInput.namespaceName },
      'name': name,
      'shape': 'entity-direct'
    };
  },
  'explicit-readonly': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed explicit-readonly expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeReadonlyAssertion) },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'explicit-readonly'
    };
  },
  'exposed-defaults': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed exposed-defaults expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeReadonlyAssertion) },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'exposed-defaults'
    };
  },
  'interface-matrix': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed interface-matrix expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': {
        'aliasAssertions': intakeAssertionArray(rawExpected.aliasAssertions, intakeAliasAssertion),
        'interfaceAssertions': intakeAssertionArray(rawExpected.interfaceAssertions, intakeInterfaceAssertion)
      },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'interface-matrix'
    };
  },
  'owner-direct': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed owner-direct expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeRequiredAssertion) },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'owner-direct'
    };
  },
  'readonly-exclusions': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected) || !isReadonlyStringArray(rawExpected.excluded)) {
      throw new TypeError(`malformed readonly-exclusions expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeExclusionAssertion), 'excluded': rawExpected.excluded },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'readonly-exclusions'
    };
  },
  'readonly-indirection': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawExpected)) {
      throw new TypeError(`malformed readonly-indirection expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': { 'assertions': intakeAssertionArray(rawExpected.assertions, intakeReadonlyAssertion) },
      'input': intakeFilesInput(rawInput),
      'name': name,
      'shape': 'readonly-indirection'
    };
  },
  'readonly-intrinsics': (name, rawInput, rawExpected) => {
    if (!Predicates.isObject(rawInput) || !Predicates.isObject(rawInput.programs)) {
      throw new TypeError(`malformed readonly-intrinsics input: ${JSON.stringify(rawInput)}`);
    }
    if (!Predicates.isObject(rawExpected) || !Predicates.isObject(rawExpected.assertions)) {
      throw new TypeError(`malformed readonly-intrinsics expected: ${JSON.stringify(rawExpected)}`);
    }
    return {
      'expected': {
        'assertions': {
          'intrinsic': intakeAssertionArray(rawExpected.assertions.intrinsic, intakeIntrinsicAssertion),
          'shadowed': intakeAssertionArray(rawExpected.assertions.shadowed, intakeShadowedAssertion)
        }
      },
      'input': {
        'programs': {
          'intrinsic': intakeFiles(rawInput.programs.intrinsic),
          'shadowed': intakeFiles(rawInput.programs.shadowed)
        }
      },
      'name': name,
      'shape': 'readonly-intrinsics'
    };
  }
};

/** Validates one raw scenario fixture entry, including its shape-specific payload, at the JSON-load edge. */
function intakeScenarioCase(raw: unknown): ScenarioCase {
  if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !isScenarioShape(raw.shape)) {
    throw new TypeError(`malformed TypeContractClassification scenario entry: ${JSON.stringify(raw)}`);
  }
  return SCENARIO_PAYLOAD_INTAKE[raw.shape](raw.name, raw.input, raw.expected);
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenario: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'alias-cycles': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    for (const expected of scenario.expected.assertions) {
      assertAliasOutcome(program, expected.name, expected);
    }
  },
  'composition-provenance': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    const classification = TypeContractClassification.forProgram(program);
    for (const expected of scenario.expected.assertions) {
      const actual = classification.analyzeAlias(alias(program, expected.name));
      assert.equal(actual.classification, expected.classification, expected.name);
      if (expected.reason !== undefined) {
        assert.equal(actual.reason, expected.reason, expected.name);
      }
    }
    assert.equal(TypeContractClassification.forProgram(program), classification);
  },
  'entity-direct': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    const actual = TypeContractClassification.forProgram(program).analyzeAlias(
      namespaceAlias(program, scenario.input.namespaceName, scenario.input.aliasName)
    );
    assert.equal(actual.classification, scenario.expected.classification, scenario.input.aliasName);
    assert.equal(actual.reason, scenario.expected.reason, scenario.input.aliasName);
    assert.ok(actual.evidence.pos >= 0, scenario.input.aliasName);
  },
  'explicit-readonly': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    for (const expected of scenario.expected.assertions) {
      assertAliasOutcome(program, expected.name, expected);
    }
  },
  'exposed-defaults': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    for (const expected of scenario.expected.assertions) {
      assertAliasOutcome(program, expected.name, expected);
    }
  },
  'interface-matrix': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    for (const expected of scenario.expected.interfaceAssertions) {
      assertInterfaceOutcome(program, expected.name, expected);
    }
    for (const expected of scenario.expected.aliasAssertions) {
      assertAliasOutcome(program, expected.name, expected);
    }
  },
  'owner-direct': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    const classification = TypeContractClassification.forProgram(program);
    for (const expected of scenario.expected.assertions) {
      const actual = classification.analyzeAlias(alias(program, expected.name));
      assert.equal(actual.classification, expected.classification, expected.name);
      if (expected.reason !== undefined) {
        assert.equal(actual.reason, expected.reason, expected.name);
      }
    }
  },
  'readonly-exclusions': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    for (const name of scenario.expected.excluded) {
      assertAliasOutcome(program, name, { readonlyReasons: [] });
    }
    for (const expected of scenario.expected.assertions) {
      assertAliasOutcome(program, expected.name, expected);
    }
  },
  'readonly-indirection': (scenario) => {
    const program = programFromFiles(scenario.input.files);
    for (const expected of scenario.expected.assertions) {
      assertAliasOutcome(program, expected.name, expected);
    }
  },
  'readonly-intrinsics': (scenario) => {
    const intrinsicProgram = programFromFiles(scenario.input.programs.intrinsic);
    const shadowedProgram = programFromFiles(scenario.input.programs.shadowed);
    for (const expected of scenario.expected.assertions.intrinsic) {
      assertAliasOutcome(intrinsicProgram, expected.name, expected);
    }
    for (const expected of scenario.expected.assertions.shadowed) {
      assertAliasOutcome(shadowedProgram, expected.name, expected);
    }
  }
};

function runCase<K extends ScenarioCase['shape']>(scenario: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenario.shape](scenario);
}

void describe('TypeContractClassification', () => {
  for (const scenario of scenarioGroups.cases.map(intakeScenarioCase)) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
