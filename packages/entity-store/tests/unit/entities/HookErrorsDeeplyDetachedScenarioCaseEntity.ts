import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { ErrorCauseMutationEntity } from "./common/ErrorCauseMutationEntity.js";
import { HookFailureEntity } from "./common/HookFailureEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `hook-errors-deeply-detached` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HookErrorsDeeplyDetachedScenarioCaseEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      description: {
        minLength: 1,
        type: "string",
      },
      expected: {
        additionalProperties: false,
        properties: {
          cause: {
            additionalProperties: false,
            properties: {
              details: {
                additionalProperties: false,
                properties: {
                  attempts: {
                    items: {
                      type: "number",
                    },
                    type: "array",
                  },
                },
                required: ["attempts"],
                type: "object",
              },
              message: {
                type: "string",
              },
            },
            required: ["details", "message"],
            type: "object",
          },
          hookErrorCount: {
            type: "number",
          },
          hookName: {
            type: "string",
          },
        },
        required: ["cause", "hookErrorCount", "hookName"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          cause: {
            additionalProperties: false,
            properties: {
              attempts: {
                items: {
                  type: "number",
                },
                type: "array",
              },
            },
            required: ["attempts"],
            type: "object",
          },
          entity: UserEntity.Schema,
          failure: HookFailureEntity.Schema,
          mutation: ErrorCauseMutationEntity.Schema,
        },
        required: ["cause", "entity", "failure", "mutation"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "hook-errors-deeply-detached",
      },
    },
    required: ["description", "expected", "input", "name", "shape"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      description: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      expected: SchemaNode.defineObject({
          type: "object",
        } as const, {
          cause: SchemaNode.defineObject({
              type: "object",
            } as const, {
              details: SchemaNode.defineObject({
                  type: "object",
                } as const, {
                  attempts: SchemaNode.defineArray({
                      type: "array",
                    } as const, SchemaNode.defineNumber({
                      type: "number",
                    } as const), undefined),
                }, ["attempts"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
              message: SchemaNode.defineString({
                type: "string",
              } as const),
            }, ["details", "message"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          hookErrorCount: SchemaNode.defineNumber({
            type: "number",
          } as const),
          hookName: SchemaNode.defineString({
            type: "string",
          } as const),
        }, ["cause", "hookErrorCount", "hookName"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          cause: SchemaNode.defineObject({
              type: "object",
            } as const, {
              attempts: SchemaNode.defineArray({
                  type: "array",
                } as const, SchemaNode.defineNumber({
                  type: "number",
                } as const), undefined),
            }, ["attempts"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          entity: UserEntity.Node,
          failure: HookFailureEntity.Node,
          mutation: ErrorCauseMutationEntity.Node,
        }, ["cause", "entity", "failure", "mutation"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "hook-errors-deeply-detached" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
