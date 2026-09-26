---
"@studnicky/event-bus": patch
---

The eight const-discriminated FSM event/state/effect entities (`BusQueueAbortEventEntity`, `BusQueueStartLoopEventEntity`, `BusQueueLoopFinishedEventEntity`, `BusQueueOpenStateEntity`, `BusQueueDrainingStateEntity`, `BusQueueAbortingStateEntity`, `BusQueueAbortedStateEntity`, `BusQueueReleaseForAbortEffectEntity`) drop the redundant `'type': 'string'` sibling next to `'const'` in their hand-authored `Schema` — `SchemaNode.defineConst`'s single-argument form never emits that sibling on the `Node` side, so the two now agree structurally.
