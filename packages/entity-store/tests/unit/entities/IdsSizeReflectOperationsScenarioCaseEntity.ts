import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { OperationCheckpointsEntity } from "./common/OperationCheckpointsEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `ids-size-reflect-operations` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace IdsSizeReflectOperationsScenarioCaseEntity {
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
          checkpoints: OperationCheckpointsEntity.Schema,
          entity: UserEntity.Schema,
          ids: {
            items: {
              type: "string",
            },
            type: "array",
          },
          missingId: {
            type: "string",
          },
          size: {
            type: "number",
          },
        },
        required: ["checkpoints", "entity", "ids", "missingId", "size"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          added: UserEntity.Schema,
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
          initial: {
            type: "number",
          },
          removedId: {
            type: "string",
          },
        },
        required: ["added", "entities", "initial", "removedId"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "ids-size-reflect-operations",
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
          checkpoints: OperationCheckpointsEntity.Node,
          entity: UserEntity.Node,
          ids: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            SchemaNode.defineString({
              type: "string",
            } as const),
          ),
          missingId: SchemaNode.defineString({
            type: "string",
          } as const),
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        },
        ["checkpoints", "entity", "ids", "missingId", "size"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          added: UserEntity.Node,
          entities: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            UserEntity.Node,
          ),
          initial: SchemaNode.defineNumber({
            type: "number",
          } as const),
          removedId: SchemaNode.defineString({
            type: "string",
          } as const),
        },
        ["added", "entities", "initial", "removedId"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst("ids-size-reflect-operations" as const),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
