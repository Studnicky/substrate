---
"@studnicky/worker-pool": patch
---

A task whose composed timeout signal is already aborted before it is ever posted to a worker rejects with a message stating that dispatch never happened, and fires `onWorkerError` instead of `onWorkerTimeout` — that task never timed out. A genuine in-flight timeout continues to reject with a timeout message and fires `onWorkerTimeout`. Both rejections attach the signal's `reason`, when present, as the error's `cause`, so a classifier or consumer can reach the underlying reason instead of only a generic timeout label.
