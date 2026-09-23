---
"@studnicky/types": minor
"@studnicky/eslint-config": minor
---

`JsonObject` gains two sanctioned runtime-keyed writes: `fromEntries(entries)` builds a plain object from a `Map`/pair-iterable once every key is known, and `write(target, key, value)` performs a single guarded `[[Set]]` onto an existing target, rejecting `__proto__`. The `dynamic-property-access` lint rule now also covers `Reflect.set` (previously unchecked) and exempts calls resolved to these two `JsonObject` members by declaration identity — class, member, and declaring source file — so a same-named class elsewhere still reports. Every call site across the workspace that mutated a fresh or existing object with a variable key now goes through one of these two primitives instead of raw `Reflect.set`.
