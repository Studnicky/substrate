---
"@studnicky/event-bus": patch
---

`BusQueueOptionsEntity.Schema` declares `required: []`, matching what its `Node` always emits — the two previously disagreed on a field neither runtime validation path reads, but any caller comparing the pair structurally now gets a match.
