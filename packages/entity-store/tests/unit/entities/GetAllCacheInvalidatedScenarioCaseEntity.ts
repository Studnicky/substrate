import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `get-all-cache-invalidated` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace GetAllCacheInvalidatedScenarioCaseEntity {
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
          idsAfterMutation: {
            items: {
              type: "string",
            },
            type: "array",
          },
          idsBeforeMutation: {
            items: {
              type: "string",
            },
            type: "array",
          },
        },
        required: ["idsAfterMutation", "idsBeforeMutation"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
          mutation: UserEntity.Schema,
        },
        required: ["entities", "mutation"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "get-all-cache-invalidated",
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
          idsAfterMutation: SchemaNode.defineArray({
              type: "array",
            } as const, SchemaNode.defineString({
              type: "string",
            } as const), undefined),
          idsBeforeMutation: SchemaNode.defineArray({
              type: "array",
            } as const, SchemaNode.defineString({
              type: "string",
            } as const), undefined),
        }, ["idsAfterMutation", "idsBeforeMutation"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          entities: SchemaNode.defineArray({
              type: "array",
            } as const, UserEntity.Node, undefined),
          mutation: UserEntity.Node,
        }, ["entities", "mutation"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "get-all-cache-invalidated" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
