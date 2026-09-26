import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `get-all-defensive-snapshot` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace GetAllDefensiveSnapshotScenarioCaseEntity {
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
          defensiveCopy: {
            type: "boolean",
          },
          ids: {
            items: {
              type: "string",
            },
            type: "array",
          },
        },
        required: ["defensiveCopy", "ids"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
          snapshotMutation: UserEntity.Schema,
        },
        required: ["entities", "snapshotMutation"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "get-all-defensive-snapshot",
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
          defensiveCopy: SchemaNode.defineBoolean({
            type: "boolean",
          } as const),
          ids: SchemaNode.defineArray({
              type: "array",
            } as const, SchemaNode.defineString({
              type: "string",
            } as const), undefined),
        }, ["defensiveCopy", "ids"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          entities: SchemaNode.defineArray({
              type: "array",
            } as const, UserEntity.Node, undefined),
          snapshotMutation: UserEntity.Node,
        }, ["entities", "snapshotMutation"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "get-all-defensive-snapshot" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
