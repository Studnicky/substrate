---
"@studnicky/entity": major
---

`SchemaNode.defineArray` and `SchemaNode.defineObject` build their schema literal through `PickDefined.from` instead of writing an `undefined`-valued `contains`/`patternProperties` key onto the object, so the runtime shape matches the type's optional-key semantics under `exactOptionalPropertyTypes` without a cast bridging through `unknown`.

`Compose.pick`, `Compose.omit`, and `Compose.extend` narrow only the `properties`/`required` fields their own filter/merge logic actually computes, with a direct assertion to the exact `Pick`/`Omit`/`Extract`/`Exclude`-derived type — never the whole return object through `unknown`. `Compose.keepProperties`/`dropProperties`/`keepValues`/`dropValues` are generic over `ObjectSchemaShapeInterface`, not the caller's branded `TSchema`, so a scoped assertion on the two fields those helpers actually touch is the one place per method the branded generic type is restored.

No `as unknown as` remains in either file.

`Compose.ts` carries four single-hop `as` assertions across `pick`/`omit`/`extend` where a generic `keepProperties`/`dropProperties`/`keepValues`/`dropValues` could carry one instead: parameterizing each over the caller's `TProperties`/`TKeys` and asserting once inside, at the point `Object.fromEntries` genuinely returns `Record<string, unknown>`, would let all three call sites drop their own assertion entirely. A known shape, not fixed here.
