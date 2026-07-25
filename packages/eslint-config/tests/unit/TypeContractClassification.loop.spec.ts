import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

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
  ModuleResolutionKind,
  ScriptKind,
  ScriptTarget,
  type SourceFile
} from 'typescript';

import { TypeContractClassification } from '../../src/rules/shared/TypeContractClassification.js';
import scenarioGroups from './TypeContractClassification.scenarios.json';

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
    throw new Error(`Missing fixture source: ${filename}`);
  }
  return source;
}

function alias(program: ReturnType<typeof createFixture>, name: string, filename = 'root.ts') {
  const declaration = sourceFile(program, filename).statements.find((statement) => {
    return isTypeAliasDeclaration(statement) && statement.name.text === name;
  });
  if (declaration === undefined || !isTypeAliasDeclaration(declaration)) {
    throw new Error(`Missing type alias: ${name}`);
  }
  return declaration;
}

function namespaceAlias(
  program: ReturnType<typeof createFixture>,
  namespaceName: string,
  aliasName: string,
  filename = 'root.ts'
): NonNullable<ReturnType<typeof alias>> {
  const namespaceDeclaration = sourceFile(program, filename).statements.find((statement) => {
    return isModuleDeclaration(statement) && statement.name.text === namespaceName;
  });
  const namespaceBody = namespaceDeclaration?.body;
  if (namespaceBody === undefined || !isModuleBlock(namespaceBody)) {
    throw new Error(`Missing namespace body: ${namespaceName}`);
  }
  const declaration = namespaceBody.statements.find((statement) => {
    return isTypeAliasDeclaration(statement) && statement.name.text === aliasName;
  });
  if (declaration === undefined || !isTypeAliasDeclaration(declaration)) {
    throw new Error(`Missing namespace type alias: ${namespaceName}.${aliasName}`);
  }
  return declaration;
}

function interfaceDeclaration(program: ReturnType<typeof createFixture>, name: string) {
  const declaration = sourceFile(program).statements.find((statement) => {
    return isInterfaceDeclaration(statement) && statement.name.text === name;
  });
  if (declaration === undefined || !isInterfaceDeclaration(declaration)) {
    throw new Error(`Missing interface: ${name}`);
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
    readonlyLength?: number;
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
  if (expected.readonlyLength !== undefined) {
    assert.equal(actual.readonlyOutput.length, expected.readonlyLength, name);
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
      description: string;
      expected: { classification: string; reason: string };
      input: { aliasName: string; files: Record<string, string>; namespaceName: string };
      kind: 'entity-direct';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ classification: string; name: string; reason?: string }>;
      };
      input: { files: Record<string, string> };
      kind: 'composition-provenance';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ classification: string; name: string; reason?: string }>;
      };
      input: { files: Record<string, string> };
      kind: 'owner-direct';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ classification?: string; evidence?: boolean; fixable?: boolean; name: string; reason?: string; readonlyLength?: number; readonlyReasons?: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      kind: 'alias-cycles';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: {
          intrinsic: Array<{ classification: string; fixable: false; name: string; readonlyReasons: readonly string[]; reason: string }>;
          shadowed: Array<{ name: string; readonlyLength: 0 }>;
        };
      };
      input: {
        programs: {
          intrinsic: Record<string, string>;
          shadowed: Record<string, string>;
        };
      };
      kind: 'readonly-intrinsics';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ fixable: boolean; name: string; readonlyReasons: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      kind: 'explicit-readonly';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ fixable: boolean; name: string; readonlyReasons: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      kind: 'exposed-defaults';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ name: string; readonlyReasons?: readonly string[] }>;
        excluded: readonly string[];
      };
      input: { files: Record<string, string> };
      kind: 'readonly-exclusions';
      name: string;
    }
  | {
      description: string;
      expected: {
        assertions: Array<{ fixable: boolean; name: string; readonlyReasons: readonly string[] }>;
      };
      input: { files: Record<string, string> };
      kind: 'readonly-indirection';
      name: string;
    }
  | {
      description: string;
      expected: {
        aliasAssertions: Array<{ classification?: string; name: string; reason?: string; readonlyLength?: number }>;
        interfaceAssertions: Array<{ classification?: string; name: string; reason?: string }>;
      };
      input: { files: Record<string, string> };
      kind: 'interface-matrix';
      name: string;
    };

const runnerMap: Record<ScenarioCase['kind'], (scenario: ScenarioCase) => void> = {
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
      assertAliasOutcome(program, name, { readonlyLength: 0 });
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

void describe('TypeContractClassification', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runnerMap[scenario.kind](scenario);
    });
  }
});
