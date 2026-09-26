import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { DetachedGetterMutationsEntity } from "./common/DetachedGetterMutationsEntity.js";
import { NestedUserEntity } from "./common/NestedUserEntity.js";

/** The `deep-detached-getters` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace DeepDetachedGettersScenarioCaseEntity {
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
          entity: NestedUserEntity.Schema,
        },
        required: ["entity"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entity: NestedUserEntity.Schema,
          mutations: DetachedGetterMutationsEntity.Schema,
        },
        required: ["entity", "mutations"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "deep-detached-getters",
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
          entity: NestedUserEntity.Node,
        }, ["entity"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      input: SchemaNode.defineObject({
          type: "object",
        } as const, {
          entity: NestedUserEntity.Node,
          mutations: DetachedGetterMutationsEntity.Node,
        }, ["entity", "mutations"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst({}, "deep-detached-getters" as const),
    }, ["description", "expected", "input", "name", "shape"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
