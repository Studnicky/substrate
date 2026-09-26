import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { HookFailureEntity } from "./common/HookFailureEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `throwing-on-upsert-preserves-store` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace ThrowingOnUpsertPreservesStoreScenarioCaseEntity {
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
          hookErrorCount: {
            type: "number",
          },
          size: {
            type: "number",
          },
        },
        required: ["entity", "hookErrorCount", "size"],
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
        const: "throwing-on-upsert-preserves-store",
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
          hookErrorCount: SchemaNode.defineNumber({
            type: "number",
          } as const),
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        },
        ["entity", "hookErrorCount", "size"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          entity: UserEntity.Node,
          failure: HookFailureEntity.Node,
        },
        ["entity", "failure"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst(
        "throwing-on-upsert-preserves-store" as const,
      ),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
