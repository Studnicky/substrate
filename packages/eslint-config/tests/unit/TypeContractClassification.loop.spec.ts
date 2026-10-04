import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  type CompilerHost,
  type CompilerOptions,
  createCompilerHost,
  createProgram,
  createSourceFile,
  type CreateSourceFileOptions,
  type InterfaceDeclaration,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isTypeAliasDeclaration,
  type ModuleDeclaration,
  ModuleKind,
  ModuleResolutionKind,
  type Program,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
  type TypeAliasDeclaration
} from 'typescript';

import { TypeContractClassification } from '../../src/rules/shared/TypeContractClassification.js';
import scenarioGroups from './TypeContractClassification.scenarios.json' with { 'type': 'json' };

interface AliasOutcomeExpectationInterface {
  readonly 'classification'?: string | undefined;
  readonly 'evidence'?: boolean | undefined;
  readonly 'fixable'?: boolean | undefined;
  readonly 'readonlyReasons'?: readonly string[] | undefined;
  readonly 'reason'?: string | undefined;
}

interface AliasAssertionInterface extends AliasOutcomeExpectationInterface {
  readonly 'name': string;
}

interface InterfaceOutcomeExpectationInterface {
  readonly 'classification'?: string | undefined;
  readonly 'reason'?: string | undefined;
}

interface InterfaceAssertionInterface extends InterfaceOutcomeExpectationInterface {
  readonly 'name': string;
}

interface RequiredAssertionInterface {
  readonly 'classification': string;
  readonly 'name': string;
  readonly 'reason'?: string | undefined;
}

class VirtualFixtureHost {
  public static readonly 'compilerOptions': CompilerOptions = {
    'allowImportingTsExtensions': true,
    'module': ModuleKind.NodeNext,
    'moduleResolution': ModuleResolutionKind.NodeNext,
    'skipLibCheck': true,
    'strict': true,
    'target': ScriptTarget.ESNext
  };

  public static readonly 'virtualRoot': string = resolve(import.meta.dirname, '../..', '.type-contract-classification');

  public static createFixture(sources: ReadonlyMap<string, string>): Program {
    const files = new Map<string, string>();

    sources.forEach((source, filename) => {
      files.set(resolve(VirtualFixtureHost.virtualRoot, filename), source);
    });

    const baseHost = createCompilerHost(VirtualFixtureHost.compilerOptions);
    const host: CompilerHost = { ...baseHost };

    host.directoryExists = (directory: string): boolean => {
      const normalized = resolve(directory);
      const virtualDirectory = [...files.keys()].some((filename) => {
        const nested = filename.startsWith(`${normalized}/`);

        return nested;
      });
      const exists = virtualDirectory || baseHost.directoryExists?.(directory) === true;

      return exists;
    };
    host.fileExists = (filename: string): boolean => {
      const exists = files.has(resolve(filename)) || baseHost.fileExists(filename);

      return exists;
    };
    host.getSourceFile = (filename: string, languageVersion: CreateSourceFileOptions | ScriptTarget, onError, shouldCreateNewSourceFile): SourceFile | undefined => {
      const source = files.get(resolve(filename));
      const sourceFile = source === undefined
        ? baseHost.getSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile)
        : createSourceFile(filename, source, languageVersion, true, ScriptKind.TS);

      return sourceFile;
    };
    host.readFile = (filename: string): string | undefined => {
      const contents = files.get(resolve(filename)) ?? baseHost.readFile(filename);

      return contents;
    };

    const result = createProgram({
      'host': host,
      'options': VirtualFixtureHost.compilerOptions,
      'rootNames': [...files.keys()]
    });

    return result;
  }
}

class FixtureLookup {
  public static alias(program: Program, name: string, filename = 'root.ts'): TypeAliasDeclaration {
    const declaration = FixtureLookup.sourceFile(program, filename).statements.find((statement) => {
      const matches = isTypeAliasDeclaration(statement) && statement.name.text === name;

      return matches;
    });

    if (declaration !== undefined && isTypeAliasDeclaration(declaration)) {
      return declaration;
    }

    throw RuntimeError.create(`Missing type alias: ${name}`);
  }

  public static interfaceDeclaration(program: Program, name: string): InterfaceDeclaration {
    const declaration = FixtureLookup.sourceFile(program, 'root.ts').statements.find((statement) => {
      const matches = isInterfaceDeclaration(statement) && statement.name.text === name;

      return matches;
    });

    if (declaration !== undefined && isInterfaceDeclaration(declaration)) {
      return declaration;
    }

    throw RuntimeError.create(`Missing interface: ${name}`);
  }

  public static namespaceAlias(
    program: Program,
    namespaceName: string,
    aliasName: string,
    filename = 'root.ts'
  ): TypeAliasDeclaration {
    const namespaceDeclaration = FixtureLookup.sourceFile(program, filename).statements.find(
      (statement): statement is ModuleDeclaration => {
        const matches = isModuleDeclaration(statement) && statement.name.text === namespaceName;

        return matches;
      }
    );
    const namespaceBody = namespaceDeclaration?.body;

    if (namespaceBody !== undefined && isModuleBlock(namespaceBody)) {
      const declaration = namespaceBody.statements.find((statement) => {
        const matches = isTypeAliasDeclaration(statement) && statement.name.text === aliasName;

        return matches;
      });

      if (declaration !== undefined && isTypeAliasDeclaration(declaration)) {
        return declaration;
      }

      throw RuntimeError.create(`Missing namespace type alias: ${namespaceName}.${aliasName}`);
    }

    throw RuntimeError.create(`Missing namespace body: ${namespaceName}`);
  }

  public static programFromFiles(files: Record<string, string>): Program {
    const result = VirtualFixtureHost.createFixture(new Map(Object.entries(files)));

    return result;
  }

  private static sourceFile(program: Program, filename: string): SourceFile {
    const source = program.getSourceFile(resolve(VirtualFixtureHost.virtualRoot, filename));

    if (source !== undefined) {
      return source;
    }

    throw RuntimeError.create(`Missing fixture source: ${filename}`);
  }
}

class OutcomeAssertions {
  public static alias(program: Program, name: string, expected: AliasOutcomeExpectationInterface): void {
    const actual = TypeContractClassification.forProgram(program).analyzeAlias(FixtureLookup.alias(program, name));

    if (expected.classification !== undefined) {
      assert.equal(actual.classification, expected.classification, name);
    }
    if (expected.reason !== undefined) {
      assert.equal(actual.reason, expected.reason, name);
    }
    if (expected.evidence === true) {
      assert.ok(actual.evidence.pos >= 0, name);
    }
    if (expected.readonlyReasons !== undefined) {
      assert.deepEqual(
        actual.readonlyOutput.map((entry) => {
          return entry.reason;
        }),
        expected.readonlyReasons,
        name
      );
    }
    if (expected.fixable !== undefined) {
      assert.equal(actual.readonlyOutput[0]?.fixable, expected.fixable, name);
    }
  }

  public static aliasList(program: Program, assertions: readonly AliasAssertionInterface[]): void {
    for (let index = 0; index < assertions.length; index += 1) {
      const expected = assertions[index]!;

      OutcomeAssertions.alias(program, expected.name, expected);
    }
  }

  public static interfaceDeclaration(program: Program, name: string, expected: InterfaceOutcomeExpectationInterface): void {
    const actual = TypeContractClassification.forProgram(program).analyzeInterface(FixtureLookup.interfaceDeclaration(program, name));

    if (expected.classification !== undefined) {
      assert.equal(actual.classification, expected.classification, name);
    }
    if (expected.reason !== undefined) {
      assert.equal(actual.reason, expected.reason, name);
    }
  }

  public static interfaceList(program: Program, assertions: readonly InterfaceAssertionInterface[]): void {
    for (let index = 0; index < assertions.length; index += 1) {
      const expected = assertions[index]!;

      OutcomeAssertions.interfaceDeclaration(program, expected.name, expected);
    }
  }

  public static provenance(
    program: Program,
    classification: ReturnType<typeof TypeContractClassification.forProgram>,
    assertions: readonly RequiredAssertionInterface[]
  ): void {
    for (let index = 0; index < assertions.length; index += 1) {
      const expected = assertions[index]!;
      const actual = classification.analyzeAlias(FixtureLookup.alias(program, expected.name));

      assert.equal(actual.classification, expected.classification, expected.name);
      if (expected.reason !== undefined) {
        assert.equal(actual.reason, expected.reason, expected.name);
      }
    }
  }
}

class ScenarioIntake {
  public static aliasAssertion(raw: unknown): AliasAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !ScenarioIntake.isOptionalString(raw.classification) || !ScenarioIntake.isOptionalString(raw.reason) || !ScenarioIntake.isOptionalReadonlyStringArray(raw.readonlyReasons)) {
      throw ScenarioIntake.malformed('TypeContractClassification alias assertion', raw);
    }
    const result: AliasAssertionInterface = {
      'classification': raw.classification,
      'name': raw.name,
      'readonlyReasons': raw.readonlyReasons,
      'reason': raw.reason
    };

    return result;
  }

  public static assertionArray<Assertion>(raw: unknown, intakeOne: (entry: unknown) => Assertion): Assertion[] {
    if (!Array.isArray(raw)) {
      throw ScenarioIntake.malformed('TypeContractClassification assertions array', raw);
    }
    const result = raw.map(intakeOne);

    return result;
  }

  public static cycleAssertion(raw: unknown): AliasAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !ScenarioIntake.isOptionalString(raw.classification) || !ScenarioIntake.isOptionalString(raw.reason) || !ScenarioIntake.isOptionalBoolean(raw.fixable) || !ScenarioIntake.isOptionalBoolean(raw.evidence) || !ScenarioIntake.isOptionalReadonlyStringArray(raw.readonlyReasons)) {
      throw ScenarioIntake.malformed('TypeContractClassification cycle assertion', raw);
    }
    const result: AliasAssertionInterface = {
      'classification': raw.classification,
      'evidence': raw.evidence,
      'fixable': raw.fixable,
      'name': raw.name,
      'readonlyReasons': raw.readonlyReasons,
      'reason': raw.reason
    };

    return result;
  }

  public static exclusionAssertion(raw: unknown): AliasAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !ScenarioIntake.isOptionalReadonlyStringArray(raw.readonlyReasons)) {
      throw ScenarioIntake.malformed('TypeContractClassification exclusion assertion', raw);
    }
    const result: AliasAssertionInterface = { 'name': raw.name, 'readonlyReasons': raw.readonlyReasons };

    return result;
  }

  public static expectedObject(description: string, raw: unknown): Record<string, unknown> {
    if (Predicates.isObject(raw)) {
      return raw;
    }

    throw ScenarioIntake.malformed(description, raw);
  }

  public static files(raw: unknown): Record<string, string> {
    if (!ScenarioIntake.isRecordOfStrings(raw)) {
      throw ScenarioIntake.malformed('TypeContractClassification files map', raw);
    }

    return raw;
  }

  public static filesOf(raw: unknown): Record<string, string> {
    if (!Predicates.isObject(raw)) {
      throw ScenarioIntake.malformed('TypeContractClassification input', raw);
    }
    const result = ScenarioIntake.files(raw.files);

    return result;
  }

  public static interfaceAssertion(raw: unknown): InterfaceAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !ScenarioIntake.isOptionalString(raw.classification) || !ScenarioIntake.isOptionalString(raw.reason)) {
      throw ScenarioIntake.malformed('TypeContractClassification interface assertion', raw);
    }
    const result: InterfaceAssertionInterface = {
      'classification': raw.classification,
      'name': raw.name,
      'reason': raw.reason
    };

    return result;
  }

  public static intrinsicAssertion(raw: unknown): AliasAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.classification !== 'string' || raw.fixable !== false || typeof raw.name !== 'string' || !ScenarioIntake.isReadonlyStringArray(raw.readonlyReasons) || typeof raw.reason !== 'string') {
      throw ScenarioIntake.malformed('TypeContractClassification intrinsic assertion', raw);
    }
    const result: AliasAssertionInterface = {
      'classification': raw.classification,
      'fixable': raw.fixable,
      'name': raw.name,
      'readonlyReasons': raw.readonlyReasons,
      'reason': raw.reason
    };

    return result;
  }

  public static isReadonlyStringArray(value: unknown): value is readonly string[] {
    const result = Array.isArray(value) && value.every((entry) => {
      const isString = typeof entry === 'string';

      return isString;
    });

    return result;
  }

  public static malformed(description: string, raw: unknown): RuntimeError {
    try {
      const result = RuntimeError.create(`malformed ${description}: ${JSON.stringify(raw)}`);

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot serialize the malformed value for ${description}`, { 'cause': cause });
    }
  }

  public static readonlyAssertion(raw: unknown): AliasAssertionInterface {
    if (!Predicates.isObject(raw) || !ScenarioIntake.isOptionalBoolean(raw.fixable) || typeof raw.name !== 'string' || !ScenarioIntake.isReadonlyStringArray(raw.readonlyReasons)) {
      throw ScenarioIntake.malformed('TypeContractClassification readonly assertion', raw);
    }
    const result: AliasAssertionInterface = {
      'fixable': raw.fixable,
      'name': raw.name,
      'readonlyReasons': raw.readonlyReasons
    };

    return result;
  }

  public static requiredAssertion(raw: unknown): RequiredAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.classification !== 'string' || typeof raw.name !== 'string' || !ScenarioIntake.isOptionalString(raw.reason)) {
      throw ScenarioIntake.malformed('TypeContractClassification assertion', raw);
    }
    const result: RequiredAssertionInterface = {
      'classification': raw.classification,
      'name': raw.name,
      'reason': raw.reason
    };

    return result;
  }

  public static shadowedAssertion(raw: unknown): AliasAssertionInterface {
    if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || !ScenarioIntake.isReadonlyStringArray(raw.readonlyReasons)) {
      throw ScenarioIntake.malformed('TypeContractClassification shadowed assertion', raw);
    }
    const result: AliasAssertionInterface = { 'name': raw.name, 'readonlyReasons': raw.readonlyReasons };

    return result;
  }

  private static isOptionalBoolean(value: unknown): value is boolean | undefined {
    const result = value === undefined || typeof value === 'boolean';

    return result;
  }

  private static isOptionalReadonlyStringArray(value: unknown): value is readonly string[] | undefined {
    const result = value === undefined || ScenarioIntake.isReadonlyStringArray(value);

    return result;
  }

  private static isOptionalString(value: unknown): value is string | undefined {
    const result = value === undefined || typeof value === 'string';

    return result;
  }

  private static isRecordOfStrings(value: unknown): value is Record<string, string> {
    const result = Predicates.isObject(value) && Object.values(value).every((entry) => {
      const isString = typeof entry === 'string';

      return isString;
    });

    return result;
  }
}

class TypeContractClassificationRunners {
  public static declareCases(): void {
    const cases: readonly unknown[] = scenarioGroups.cases;

    for (let index = 0; index < cases.length; index += 1) {
      TypeContractClassificationRunners.declareCase(cases[index]);
    }
  }

  private static declareCase(raw: unknown): void {
    if (!Predicates.isObject(raw) || typeof raw.name !== 'string' || typeof raw.shape !== 'string') {
      throw ScenarioIntake.malformed('TypeContractClassification scenario entry', raw);
    }
    const shape = raw.shape;
    const input = raw.input;
    const expected = raw.expected;

    void it(raw.name, () => {
      TypeContractClassificationRunners.runCase(shape, input, expected);
    });
  }

  private static runAliasCycles(rawInput: unknown, rawExpected: unknown): void {
    const program = FixtureLookup.programFromFiles(ScenarioIntake.filesOf(rawInput));
    const expected = ScenarioIntake.expectedObject('alias-cycles expected', rawExpected);

    OutcomeAssertions.aliasList(program, ScenarioIntake.assertionArray(expected.assertions, ScenarioIntake.cycleAssertion));
  }

  private static runAssertionShape(shape: string, rawInput: unknown, rawExpected: unknown): void {
    switch (shape) {
      case 'composition-provenance':
      case 'owner-direct':
        TypeContractClassificationRunners.runProvenance(shape, rawInput, rawExpected);
        break;
      case 'explicit-readonly':
      case 'exposed-defaults':
      case 'readonly-indirection':
        TypeContractClassificationRunners.runReadonlyAssertions(shape, rawInput, rawExpected);
        break;
      default:
        throw ScenarioIntake.malformed('TypeContractClassification scenario shape', shape);
    }
  }

  private static runCase(shape: string, rawInput: unknown, rawExpected: unknown): void {
    switch (shape) {
      case 'alias-cycles':
        TypeContractClassificationRunners.runAliasCycles(rawInput, rawExpected);
        break;
      case 'entity-direct':
        TypeContractClassificationRunners.runEntityDirect(rawInput, rawExpected);
        break;
      case 'interface-matrix':
        TypeContractClassificationRunners.runInterfaceMatrix(rawInput, rawExpected);
        break;
      case 'readonly-exclusions':
        TypeContractClassificationRunners.runReadonlyExclusions(rawInput, rawExpected);
        break;
      case 'readonly-intrinsics':
        TypeContractClassificationRunners.runReadonlyIntrinsics(rawInput, rawExpected);
        break;
      default:
        TypeContractClassificationRunners.runAssertionShape(shape, rawInput, rawExpected);
    }
  }

  private static runEntityDirect(rawInput: unknown, rawExpected: unknown): void {
    if (!Predicates.isObject(rawInput) || typeof rawInput.aliasName !== 'string' || typeof rawInput.namespaceName !== 'string') {
      throw ScenarioIntake.malformed('entity-direct input', rawInput);
    }
    if (!Predicates.isObject(rawExpected) || typeof rawExpected.classification !== 'string' || typeof rawExpected.reason !== 'string') {
      throw ScenarioIntake.malformed('entity-direct expected', rawExpected);
    }
    const program = FixtureLookup.programFromFiles(ScenarioIntake.files(rawInput.files));
    const actual = TypeContractClassification.forProgram(program).analyzeAlias(
      FixtureLookup.namespaceAlias(program, rawInput.namespaceName, rawInput.aliasName)
    );

    assert.equal(actual.classification, rawExpected.classification, rawInput.aliasName);
    assert.equal(actual.reason, rawExpected.reason, rawInput.aliasName);
    assert.ok(actual.evidence.pos >= 0, rawInput.aliasName);
  }

  private static runInterfaceMatrix(rawInput: unknown, rawExpected: unknown): void {
    const program = FixtureLookup.programFromFiles(ScenarioIntake.filesOf(rawInput));
    const expected = ScenarioIntake.expectedObject('interface-matrix expected', rawExpected);

    OutcomeAssertions.interfaceList(program, ScenarioIntake.assertionArray(expected.interfaceAssertions, ScenarioIntake.interfaceAssertion));
    OutcomeAssertions.aliasList(program, ScenarioIntake.assertionArray(expected.aliasAssertions, ScenarioIntake.aliasAssertion));
  }

  private static runProvenance(shape: string, rawInput: unknown, rawExpected: unknown): void {
    const program = FixtureLookup.programFromFiles(ScenarioIntake.filesOf(rawInput));
    const expected = ScenarioIntake.expectedObject(`${shape} expected`, rawExpected);
    const classification = TypeContractClassification.forProgram(program);

    OutcomeAssertions.provenance(program, classification, ScenarioIntake.assertionArray(expected.assertions, ScenarioIntake.requiredAssertion));
    if (shape === 'composition-provenance') {
      assert.ok(TypeContractClassification.forProgram(program) === classification, 'forProgram retains one classification per program');
    }
  }

  private static runReadonlyAssertions(shape: string, rawInput: unknown, rawExpected: unknown): void {
    const program = FixtureLookup.programFromFiles(ScenarioIntake.filesOf(rawInput));
    const expected = ScenarioIntake.expectedObject(`${shape} expected`, rawExpected);

    OutcomeAssertions.aliasList(program, ScenarioIntake.assertionArray(expected.assertions, ScenarioIntake.readonlyAssertion));
  }

  private static runReadonlyExclusions(rawInput: unknown, rawExpected: unknown): void {
    const expected = ScenarioIntake.expectedObject('readonly-exclusions expected', rawExpected);
    const excluded: unknown = expected.excluded;

    if (!ScenarioIntake.isReadonlyStringArray(excluded)) {
      throw ScenarioIntake.malformed('readonly-exclusions expected', rawExpected);
    }
    const program = FixtureLookup.programFromFiles(ScenarioIntake.filesOf(rawInput));

    for (let index = 0; index < excluded.length; index += 1) {
      OutcomeAssertions.alias(program, String(excluded[index]), { 'readonlyReasons': [] });
    }
    OutcomeAssertions.aliasList(program, ScenarioIntake.assertionArray(expected.assertions, ScenarioIntake.exclusionAssertion));
  }

  private static runReadonlyIntrinsics(rawInput: unknown, rawExpected: unknown): void {
    if (!Predicates.isObject(rawInput) || !Predicates.isObject(rawInput.programs)) {
      throw ScenarioIntake.malformed('readonly-intrinsics input', rawInput);
    }
    if (!Predicates.isObject(rawExpected) || !Predicates.isObject(rawExpected.assertions)) {
      throw ScenarioIntake.malformed('readonly-intrinsics expected', rawExpected);
    }
    const intrinsicProgram = FixtureLookup.programFromFiles(ScenarioIntake.files(rawInput.programs.intrinsic));
    const shadowedProgram = FixtureLookup.programFromFiles(ScenarioIntake.files(rawInput.programs.shadowed));

    OutcomeAssertions.aliasList(intrinsicProgram, ScenarioIntake.assertionArray(rawExpected.assertions.intrinsic, ScenarioIntake.intrinsicAssertion));
    OutcomeAssertions.aliasList(shadowedProgram, ScenarioIntake.assertionArray(rawExpected.assertions.shadowed, ScenarioIntake.shadowedAssertion));
  }
}

void describe('TypeContractClassification', () => {
  TypeContractClassificationRunners.declareCases();
});
