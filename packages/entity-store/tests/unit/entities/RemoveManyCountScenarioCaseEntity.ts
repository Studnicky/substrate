import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `remove-many-count` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace RemoveManyCountScenarioCaseEntity {
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
          removed: {
            type: "number",
          },
          size: {
            type: "number",
          },
        },
        required: ["removed", "size"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
          ids: {
            items: {
              type: "string",
            },
            type: "array",
          },
        },
        required: ["entities", "ids"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "remove-many-count",
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
          removed: SchemaNode.defineNumber({
            type: "number",
          } as const),
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        }, ["removed", "size"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          entities: SchemaNode.defineArray({
              type: "array",
            } as const, UserEntity.Node, undefined),
          ids: SchemaNode.defineArray({
              type: "array",
            } as const, SchemaNode.defineString({
              type: "string",
            } as const), undefined),
        }, ["entities", "ids"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "remove-many-count" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
