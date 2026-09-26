import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { SelectiveHookFailureEntity } from "./common/SelectiveHookFailureEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `hook-failure-recorded-batch-continues` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HookFailureRecordedBatchContinuesScenarioCaseEntity {
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
          entities: {
            additionalProperties: UserEntity.Schema,
            properties: {},
            required: [],
            type: "object",
          },
          hookErrorCount: {
            type: "number",
          },
          hookName: {
            type: "string",
          },
          size: {
            type: "number",
          },
        },
        required: ["entities", "hookErrorCount", "hookName", "size"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
          failure: SelectiveHookFailureEntity.Schema,
        },
        required: ["entities", "failure"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "hook-failure-recorded-batch-continues",
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
          entities: SchemaNode.defineObject(
            {
              type: "object",
            } as const,
            {},
            [] as const,
            { additionalProperties: UserEntity.Node },
          ),
          hookErrorCount: SchemaNode.defineNumber({
            type: "number",
          } as const),
          hookName: SchemaNode.defineString({
            type: "string",
          } as const),
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        },
        ["entities", "hookErrorCount", "hookName", "size"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          entities: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            UserEntity.Node,
          ),
          failure: SelectiveHookFailureEntity.Node,
        },
        ["entities", "failure"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst(
        "hook-failure-recorded-batch-continues" as const,
      ),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
