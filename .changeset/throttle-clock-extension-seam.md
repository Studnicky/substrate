---
"@studnicky/throttle": minor
---

### Added

- `Throttle` exposes a `protected now(): number` extension seam. All internal wall-clock reads — operation start/duration timing and the adaptive-adjustment interval gate — route through it, so a subclass can substitute a deterministic time source without touching global `Date.now`.
