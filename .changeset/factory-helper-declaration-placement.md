---
"@studnicky/clock": patch
"@studnicky/logger": patch
"@studnicky/timing": patch
---

### Fixed

- `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, `VirtualTimeCounter`, `MemoryTransport`, `NoOpTransport`, and `NoOpTiming` each carry their class documentation on the class again. The module-local `…SubclassInterface` and `…Instance` helpers their factories rely on sat between the doc comment and the class it describes, so the generated API reference attributed each class's summary and usage example to a non-exported helper interface and left the exported class undocumented. The helpers now precede the doc comment.
