# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `FileLock` class with `acquire()` static method: async polling loop using atomic POSIX `renameSync` to obtain exclusive write access on a file path.
- `FileLockTimeoutError` thrown when the source file does not exist (immediate) or the polling deadline elapses.
- `read()` and `write()` instance methods for operating on the locked file while the lock is held.
- Idempotent `release()` renames the lockfile back to the original path; safe to call multiple times.
- `[Symbol.dispose]()` for explicit resource management (`await using` / `using` syntax, Node.js 22+).
- Configurable `pollMs` (default 50 ms) and `timeoutMs` (default 5000 ms) via `FileLockOptions`.
