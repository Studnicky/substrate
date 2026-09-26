import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { HookFailureEntity } from "./common/HookFailureEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `throwing-on-remove-preserves-removal` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace ThrowingOnRemovePreservesRemovalScenarioCaseEntity {
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
          hookErrorCount: {
            type: "number",
          },
          removed: {
            type: "boolean",
          },
          size: {
            type: "number",
          },
        },
        required: ["hookErrorCount", "removed", "size"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entity: UserEntity.Schema,
          failure: HookFailureEntity.Schema,
        },
        required: ["entity", "failure"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "throwing-on-remove-preserves-removal",
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
          hookErrorCount: SchemaNode.defineNumber({
            type: "number",
          } as const),
          removed: SchemaNode.defineBoolean({
            type: "boolean",
          } as const),
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        }, ["hookErrorCount", "removed", "size"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          entity: UserEntity.Node,
          failure: HookFailureEntity.Node,
        }, ["entity", "failure"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "throwing-on-remove-preserves-removal" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
