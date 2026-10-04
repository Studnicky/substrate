import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import { Linter } from 'eslint';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import tseslint from 'typescript-eslint';

import { entityModelSuite } from '../../src/suites/entityModelSuite.js';
import scenarioGroups from './entityModelSuite.scenarios.json' with { 'type': 'json' };

class MessageSummary {
  readonly 'messageId': string | null;

  readonly 'ruleId': string | null;

  constructor(messageId: string | null, ruleId: string | null) {
    this.messageId = messageId;
    this.ruleId = ruleId;
  }

  static fromLinter(message: Linter.LintMessage): MessageSummary {
    const summary = new MessageSummary(message.messageId ?? null, message.ruleId ?? null);

    return summary;
  }
}

class CodeInput {
  readonly 'code': string;

  readonly 'filename': string;

  constructor(code: string, filename: string) {
    this.code = code;
    this.filename = filename;
  }
}

class OutputSummary {
  readonly 'filename': string;

  readonly 'messages': readonly MessageSummary[];

  constructor(filename: string, messages: readonly MessageSummary[]) {
    this.filename = filename;
    this.messages = messages;
  }
}

class ScenarioIntake {
  static codeInput(raw: unknown): CodeInput {
    const record = ScenarioIntake.record(raw, 'scenario input', raw);
    const input = new CodeInput(
      ScenarioIntake.text(record.code, 'scenario input', raw),
      ScenarioIntake.text(record.filename, 'scenario input', raw)
    );

    return input;
  }

  static codeInputs(raw: unknown, label: string): CodeInput[] {
    const entries = ScenarioIntake.list(raw, label);
    const inputs: CodeInput[] = [];

    for (let index = 0; index < entries.length; index += 1) {
      inputs.push(ScenarioIntake.codeInput(entries[index]));
    }

    return inputs;
  }

  static describe(value: unknown): string {
    try {
      const description = JSON.stringify(value);

      return description;
    } catch (cause) {
      throw RuntimeError.create('Cannot serialize a malformed scenario fragment', { 'cause': cause });
    }
  }

  static list(value: unknown, label: string): readonly unknown[] {
    if (Predicates.isArray(value)) {
      return value;
    }
    throw RuntimeError.create(`malformed ${label}: ${ScenarioIntake.describe(value)}`);
  }

  static message(raw: unknown): MessageSummary {
    const record = ScenarioIntake.record(raw, 'scenario message', raw);
    const { messageId, ruleId } = record;

    if ((messageId === null || typeof messageId === 'string') && (ruleId === null || typeof ruleId === 'string')) {
      const summary = new MessageSummary(messageId, ruleId);

      return summary;
    }
    throw RuntimeError.create(`malformed scenario message: ${ScenarioIntake.describe(raw)}`);
  }

  static messages(raw: unknown): MessageSummary[] {
    const entries = ScenarioIntake.list(raw, 'scenario messages');
    const summaries: MessageSummary[] = [];

    for (let index = 0; index < entries.length; index += 1) {
      summaries.push(ScenarioIntake.message(entries[index]));
    }

    return summaries;
  }

  static record(value: unknown, label: string, owner: unknown): Record<string, unknown> {
    if (Predicates.isObject(value)) {
      return value;
    }
    throw RuntimeError.create(`malformed ${label}: ${ScenarioIntake.describe(owner)}`);
  }

  static rules(raw: unknown): Linter.Config['rules'] {
    const record = ScenarioIntake.record(raw, 'rules record', raw);

    if (ScenarioIntake.isRulesRecord(record)) {
      return record;
    }
    throw RuntimeError.create(`malformed rules record: ${ScenarioIntake.describe(raw)}`);
  }

  static text(value: unknown, label: string, owner: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw RuntimeError.create(`malformed ${label}: ${ScenarioIntake.describe(owner)}`);
  }

  private static isRuleEntry(value: unknown): value is Linter.RuleEntry {
    const isEntry = ScenarioIntake.isRuleSeverity(value) || (Predicates.isArray(value) && ScenarioIntake.isRuleSeverity(value.at(0)));

    return isEntry;
  }

  private static isRulesRecord(value: Record<string, unknown>): value is Partial<Record<string, Linter.RuleEntry>> {
    const entries = Object.values(value);
    let isRules = true;

    for (let index = 0; index < entries.length; index += 1) {
      isRules = isRules && ScenarioIntake.isRuleEntry(entries[index]);
    }

    return isRules;
  }

  private static isRuleSeverity(value: unknown): value is Linter.RuleSeverity {
    const isSeverity = value === 0 || value === 1 || value === 2 || value === 'off' || value === 'warn' || value === 'error';

    return isSeverity;
  }
}

class EntityModelLinting {
  static readonly 'languageOptions': Linter.LanguageOptions = {
    'parser': tseslint.parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts', 'packages/eslint-config/tests/fixtures/relocated/src/models/*.ts', 'packages/retry/src/models/*.ts'],
        'maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING': 20
      },
      'tsconfigRootDir': resolve(import.meta.dirname, '../../../..')
    }
  };

  static summarize(input: CodeInput, extraConfig: Linter.Config): MessageSummary[] {
    const linter = new Linter();
    const messages = linter.verify(
      input.code,
      [
        {
          'files': ['**/*.ts'],
          'languageOptions': EntityModelLinting.languageOptions,
          'plugins': { '@typescript-eslint': tseslint.plugin },
          ...extraConfig
        },
        entityModelSuite
      ],
      { 'filename': input.filename }
    );
    const summaries: MessageSummary[] = [];

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];

      if (message !== undefined) {
        summaries.push(MessageSummary.fromLinter(message));
      }
    }

    return summaries;
  }
}

abstract class EntityModelScenario {
  readonly 'description': string;

  readonly 'name': string;

  protected constructor(name: string, description: string) {
    this.description = description;
    this.name = name;
  }

  static intake(raw: unknown): EntityModelScenario {
    const entry = ScenarioIntake.record(raw, 'entityModelSuite scenario entry', raw);
    const name = ScenarioIntake.text(entry.name, 'entityModelSuite scenario entry', raw);
    const description = ScenarioIntake.text(entry.description, 'entityModelSuite scenario entry', raw);
    const shape = ScenarioIntake.text(entry.shape, 'entityModelSuite scenario entry', raw);
    let scenario: EntityModelScenario;

    switch (shape) {
      case 'assigns-owning-rule':
        scenario = AssignsOwningRuleScenario.fromEntry(name, description, entry.input, entry.expected);
        break;
      case 'blocks-inline-disable':
        scenario = BlocksInlineDisableScenario.fromEntry(name, description, entry.input, entry.expected);
        break;
      case 'overrides-prefer-function-type':
        scenario = OverridesPreferFunctionTypeScenario.fromEntry(name, description, entry.input, entry.expected);
        break;
      case 'preserves-entity-rules':
        scenario = PreservesEntityRulesScenario.fromEntry(name, description, entry.input, entry.expected);
        break;
      default:
        throw RuntimeError.create(`malformed entityModelSuite scenario entry: ${ScenarioIntake.describe(raw)}`);
    }

    return scenario;
  }

  abstract run(): void;
}

class AssignsOwningRuleScenario extends EntityModelScenario {
  readonly 'expectedOutputs': readonly OutputSummary[];

  readonly 'inputs': readonly CodeInput[];

  private constructor(name: string, description: string, inputs: readonly CodeInput[], expectedOutputs: readonly OutputSummary[]) {
    super(name, description);
    this.expectedOutputs = expectedOutputs;
    this.inputs = inputs;
  }

  static fromEntry(name: string, description: string, rawInput: unknown, rawExpected: unknown): AssignsOwningRuleScenario {
    const input = ScenarioIntake.record(rawInput, 'assigns-owning-rule input', rawInput);
    const expected = ScenarioIntake.record(rawExpected, 'assigns-owning-rule expected', rawExpected);
    const rawOutputs = ScenarioIntake.list(expected.outputs, 'assigns-owning-rule expected');
    const outputs: OutputSummary[] = [];

    for (let index = 0; index < rawOutputs.length; index += 1) {
      const output = ScenarioIntake.record(rawOutputs[index], 'assigns-owning-rule output', rawOutputs[index]);

      outputs.push(new OutputSummary(
        ScenarioIntake.text(output.filename, 'assigns-owning-rule output', output),
        ScenarioIntake.messages(output.messages)
      ));
    }

    const scenario = new AssignsOwningRuleScenario(name, description, ScenarioIntake.codeInputs(input.scenarios, 'assigns-owning-rule input'), outputs);

    return scenario;
  }

  run(): void {
    const actualOutputs: OutputSummary[] = [];

    for (let index = 0; index < this.inputs.length; index += 1) {
      const input = this.inputs[index];

      if (input !== undefined) {
        actualOutputs.push(new OutputSummary(input.filename, EntityModelLinting.summarize(input, {})));
      }
    }

    assert.deepEqual(actualOutputs, this.expectedOutputs);
  }
}

class BlocksInlineDisableScenario extends EntityModelScenario {
  readonly 'expectedMessages': readonly MessageSummary[];

  readonly 'input': CodeInput;

  private constructor(name: string, description: string, input: CodeInput, expectedMessages: readonly MessageSummary[]) {
    super(name, description);
    this.expectedMessages = expectedMessages;
    this.input = input;
  }

  static fromEntry(name: string, description: string, rawInput: unknown, rawExpected: unknown): BlocksInlineDisableScenario {
    const expected = ScenarioIntake.record(rawExpected, 'blocks-inline-disable expected', rawExpected);
    const scenario = new BlocksInlineDisableScenario(name, description, ScenarioIntake.codeInput(rawInput), ScenarioIntake.messages(expected.messages));

    return scenario;
  }

  run(): void {
    assert.deepEqual(EntityModelLinting.summarize(this.input, {}), this.expectedMessages);
  }
}

class OverridesPreferFunctionTypeScenario extends EntityModelScenario {
  readonly 'expectedMessages': readonly MessageSummary[];

  readonly 'input': CodeInput;

  private constructor(name: string, description: string, input: CodeInput, expectedMessages: readonly MessageSummary[]) {
    super(name, description);
    this.expectedMessages = expectedMessages;
    this.input = input;
  }

  static fromEntry(name: string, description: string, rawInput: unknown, rawExpected: unknown): OverridesPreferFunctionTypeScenario {
    const expected = ScenarioIntake.record(rawExpected, 'overrides-prefer-function-type expected', rawExpected);
    const scenario = new OverridesPreferFunctionTypeScenario(name, description, ScenarioIntake.codeInput(rawInput), ScenarioIntake.messages(expected.messages));

    return scenario;
  }

  run(): void {
    const messages = EntityModelLinting.summarize(this.input, { 'rules': { '@typescript-eslint/prefer-function-type': 'error' } });

    assert.deepEqual(messages, this.expectedMessages);
  }
}

class PreservesEntityRulesScenario extends EntityModelScenario {
  readonly 'expectedRules': Linter.Config['rules'];

  readonly 'inputRules': Linter.Config['rules'];

  private constructor(name: string, description: string, inputRules: Linter.Config['rules'], expectedRules: Linter.Config['rules']) {
    super(name, description);
    this.expectedRules = expectedRules;
    this.inputRules = inputRules;
  }

  static fromEntry(name: string, description: string, rawInput: unknown, rawExpected: unknown): PreservesEntityRulesScenario {
    const input = ScenarioIntake.record(rawInput, 'preserves-entity-rules input', rawInput);
    const expected = ScenarioIntake.record(rawExpected, 'preserves-entity-rules expected', rawExpected);
    const scenario = new PreservesEntityRulesScenario(name, description, ScenarioIntake.rules(input.rules), ScenarioIntake.rules(expected.rules));

    return scenario;
  }

  run(): void {
    assert.deepEqual(this.inputRules, this.expectedRules);
    assert.deepEqual(entityModelSuite.linterOptions, { 'noInlineConfig': true });
    assert.deepEqual(entityModelSuite.rules, this.expectedRules);
  }
}

void describe('entityModelSuite', () => {
  for (let index = 0; index < scenarioGroups.cases.length; index += 1) {
    const rawCase: unknown = scenarioGroups.cases[index];

    if (rawCase !== undefined) {
      const scenario = EntityModelScenario.intake(rawCase);

      void it(scenario.name, () => { scenario.run(); });
    }
  }
});
