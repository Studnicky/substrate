---
"@studnicky/errors": patch
"@studnicky/types": patch
---

Removes the circular imports in `RuntimeValueArrayInterface`/`RuntimeValueMapInterface`/`RuntimeValueRecordInterface`/`RuntimeValueSetInterface` (now declared together in `RuntimeValueContainerInterfaces.ts`, since they are mutually recursive by definition) and in `ThrownValueEntity`/`thrownValueProjection` (the projection logic now lives inside `ThrownValueEntity.ts`, since `intake` wires directly to it and typing the projection's return value needs the entity's own `Type`). Public export names and subpaths are unchanged.
