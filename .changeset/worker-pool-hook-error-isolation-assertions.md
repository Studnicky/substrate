---
"@studnicky/worker-pool": patch
---

### Fixed

- The instance-local hook-error scenario asserts that each pool records only its own failures, rather than asserting how many it records. A pool that loses a worker spawns a replacement and fires `onWorkerCreated` again, so the count is a property of the run and not of the contract; the suite now checks that every recorded entry names that pool's hook and carries that pool's cause, which is the isolation the scenario describes.
