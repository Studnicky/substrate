import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { entityNamespace } from '../../src/rules/entityNamespace.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

const ENTITY_FILE = '/project/src/FooEntity.ts';

ruleTester.run('entity-namespace', entityNamespace, {
  valid: [
    {
      name: 'valid entity: Schema as const, Type from FromSchema, function type guard',
      filename: ENTITY_FILE,
      code: `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } as const;
          export type Type = FromSchema<typeof Schema>;
          export function validate(candidate: unknown): candidate is Type {
            return typeof (candidate as Record<string, unknown>).id === 'string';
          }
        }
      `
    },
    {
      name: 'valid entity: validate as const arrow function with type guard',
      filename: ENTITY_FILE,
      code: `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = FromSchema<typeof Schema>;
          export const validate = (candidate: unknown): candidate is Type => {
            return candidate !== null;
          };
        }
      `
    },
    {
      name: 'valid entity: validate compiled from schema via SchemaValidator.compile<Type>(Schema)',
      filename: ENTITY_FILE,
      code: `
        import { SchemaValidator } from '@studnicky/json';
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = FromSchema<typeof Schema>;
          export const validate = SchemaValidator.compile<Type>(Schema);
        }
      `
    }
  ],
  invalid: [
    {
      name: 'missing namespace entirely',
      filename: ENTITY_FILE,
      code: `export const FooEntity = {};`,
      errors: [{ messageId: 'noNamespace' }]
    },
    {
      name: 'Schema present but not as const → schemaNotConst',
      filename: ENTITY_FILE,
      code: `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' };
          export type Type = FromSchema<typeof Schema>;
          export function validate(candidate: unknown): candidate is Type {
            return true;
          }
        }
      `,
      errors: [{ messageId: 'schemaNotConst' }]
    },
    {
      name: 'type Type hand-written (not FromSchema) → typeNotFromSchema',
      filename: ENTITY_FILE,
      code: `
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = { id: string };
          export function validate(candidate: unknown): candidate is Type {
            return true;
          }
        }
      `,
      errors: [{ messageId: 'typeNotFromSchema' }]
    },
    {
      name: 'validate returns boolean instead of type guard → validateNotTypeGuard',
      filename: ENTITY_FILE,
      code: `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = FromSchema<typeof Schema>;
          export function validate(_candidate: unknown): boolean {
            return true;
          }
        }
      `,
      errors: [{ messageId: 'validateNotTypeGuard' }]
    },
    {
      name: 'missing Schema, Type, and validate → three errors',
      filename: ENTITY_FILE,
      code: `
        export namespace FooEntity {}
      `,
      errors: [
        { messageId: 'missingSchema' },
        { messageId: 'missingType' },
        { messageId: 'missingValidate' }
      ]
    }
  ]
});
