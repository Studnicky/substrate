import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { allTypesAreEntities } from '../../src/rules/allTypesAreEntities.js';

const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: [
          '*.ts',
          'eslint.config.mjs',
          'packages/eslint-config/src/rules/*.ts',
          'packages/retry/eslint.config.mjs',
          'packages/retry/src/entities/*.ts',
          'packages/retry/src/models/*.ts',
          'packages/retry/src/types/*.ts',
          'packages/retry/tests/unit/*.test.ts'
        ],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20
      },
      tsconfigRootDir: repoRoot
    }
  }
});

const schemaImports = "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';";

const topLevelCanonicalSource = [
  schemaImports,
  "const CanonicalSchema = { type: 'string' } as const satisfies JSONSchema;"
].join('\n');

const exactEntitySource = [
  schemaImports,
  'export namespace CanonicalEntity {',
  "  export const Schema = { type: 'string' } as const satisfies JSONSchema;",
  '  export type Type = FromSchema<typeof Schema>;',
  '}'
].join('\n');

type ValidScenarioType = {
  readonly code: string;
  readonly filename?: string;
  readonly name: string;
};

type InvalidScenarioType = {
  readonly code: string;
  readonly errors: readonly { readonly messageId: string }[];
  readonly filename?: string;
  readonly name: string;
};

const validScenarios: ValidScenarioType[] = [
  {
    code: exactEntitySource,
    filename: 'packages/retry/src/entities/TypePlacementRuleFixtureEntity.ts',
    name: 'exact schema-derived entity namespace Type form is valid'
  },
  {
    code: exactEntitySource,
    filename: 'packages/retry/tests/unit/entity-form.test.ts',
    name: 'the exact entity form remains valid in a test because semantics, not path, decide'
  },
  {
    code: 'type HandlerType = (value: string) => void;',
    filename: 'packages/retry/src/models/Handler.ts',
    name: 'interface-contract alias is left to the declaration-kind rule'
  },
  {
    code: 'type InvalidDataType = { value: string };',
    filename: 'packages/retry/src/models/InvalidData.ts',
    name: 'invalid inline data alias is left to the schema rule'
  },
  {
    code: 'type IdType = string;',
    filename: 'packages/retry/src/models/Id.ts',
    name: 'primitive forwarding alias is left to the aliasing rule'
  },
  {
    code: [exactEntitySource, 'type RenameType = CanonicalEntity.Type;'].join('\n'),
    filename: 'packages/retry/src/models/Rename.ts',
    name: 'naked canonical rename is left to the aliasing rule'
  },
  {
    code: 'type ForwardingType<T> = Array<T>;',
    filename: 'packages/retry/src/models/Forwarding.ts',
    name: 'generic forwarding alias is left to the aliasing rule'
  }
];

const invalidScenarios: InvalidScenarioType[] = [
  {
    code: [topLevelCanonicalSource, 'type FooType = FromSchema<typeof CanonicalSchema>;'].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/entities/FooEntity.ts',
    name: 'entities path does not exempt a top-level canonical alias'
  },
  {
    code: [topLevelCanonicalSource, 'export type FooType = FromSchema<typeof CanonicalSchema>;'].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/types/Foo.ts',
    name: 'src types path does not exempt a top-level canonical alias'
  },
  {
    code: [topLevelCanonicalSource, 'type TestType = FromSchema<typeof CanonicalSchema>;'].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/tests/unit/foo.test.ts',
    name: 'test path does not exempt a top-level canonical alias'
  },
  {
    code: [topLevelCanonicalSource, 'type RuleType = FromSchema<typeof CanonicalSchema>;'].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/eslint-config/src/rules/someRule.ts',
    name: 'eslint-config package path does not exempt a top-level canonical alias'
  },
  {
    code: [topLevelCanonicalSource, 'type ConfigType = FromSchema<typeof CanonicalSchema>;'].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/eslint.config.mjs',
    name: 'config path does not exempt a top-level canonical alias'
  },
  {
    code: [
      schemaImports,
      'export namespace CanonicalData {',
      "  export const Schema = { type: 'string' } as const satisfies JSONSchema;",
      '  export type Type = FromSchema<typeof Schema>;',
      '}'
    ].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/models/NonEntityNamespace.ts',
    name: 'an arbitrary namespace does not exempt a canonical alias'
  },
  {
    code: [
      schemaImports,
      'export namespace CanonicalEntity {',
      "  export const Schema = { type: 'string' } as const satisfies JSONSchema;",
      '  export type ValueType = FromSchema<typeof Schema>;',
      '}'
    ].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/models/WrongEntityMember.ts',
    name: 'an entity namespace accepts only its Type member'
  },
  {
    code: [
      exactEntitySource,
      'export namespace CollectionEntity {',
      "  export const Schema = { type: 'array' } as const satisfies JSONSchema;",
      '  export type Type = CanonicalEntity.Type[];',
      '}'
    ].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/models/CompositionEntity.ts',
    name: 'canonical composition is not a direct schema-derived entity Type'
  },
  {
    code: [
      topLevelCanonicalSource,
      'export namespace BorrowedSchemaEntity {',
      '  export type Type = FromSchema<typeof CanonicalSchema>;',
      '}'
    ].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/models/BorrowedSchemaEntity.ts',
    name: 'entity Type must derive from the Schema owned by its namespace'
  },
  {
    code: [
      topLevelCanonicalSource,
      '// json-schema-uninexpressible: comments do not alter the rule',
      'type FooType = FromSchema<typeof CanonicalSchema>;'
    ].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: 'packages/retry/src/models/FooComment.ts',
    name: 'comment before a canonical alias is inert'
  }
];

ruleTester.run('all-types-are-entities', allTypesAreEntities, {
  invalid: invalidScenarios,
  valid: validScenarios
});
