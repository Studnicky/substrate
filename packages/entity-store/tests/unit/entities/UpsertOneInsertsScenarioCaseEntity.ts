import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `upsert-one-inserts` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace UpsertOneInsertsScenarioCaseEntity {
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
          entity: UserEntity.Schema,
        },
        required: ["entity"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "upsert-one-inserts",
      },
    },
    required: ["description", "expected", "input", "name", "shape"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject(
    { type: "object" } as const,
    {
      description: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      expected: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          entity: UserEntity.Node,
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        },
        ["entity", "size"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          entity: UserEntity.Node,
        },
        ["entity"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst("upsert-one-inserts" as const),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
