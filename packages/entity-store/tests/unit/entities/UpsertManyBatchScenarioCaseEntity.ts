import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `upsert-many-batch` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace UpsertManyBatchScenarioCaseEntity {
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
          entity: UserEntity.Schema,
          size: {
            type: "number",
          },
        },
        required: ["entity", "size"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
        },
        required: ["entities"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "upsert-many-batch",
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
          entity: UserEntity.Node,
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        }, ["entity", "size"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          entities: SchemaNode.defineArray({
              type: "array",
            } as const, UserEntity.Node, undefined),
        }, ["entities"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "upsert-many-batch" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
