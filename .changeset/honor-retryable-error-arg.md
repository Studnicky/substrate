---
"@studnicky/sample-buffer": patch
"@studnicky/batch": patch
"@studnicky/virtual-fs": patch
"@studnicky/circular-buffer": patch
"@studnicky/visible-range": patch
---

`SampleBufferError`, `BatchError`, `VirtualFileSystemError`, `CircularBufferError`, and `VisibleRangeError` honour a supplied `retryable` construction argument instead of discarding it, defaulting to `false` when omitted. Each declares `retryable` on its args interface, so a caller-supplied value now reaches `BaseError` and is readable as `error.retryable`.
