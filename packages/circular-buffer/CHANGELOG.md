# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- Generic `CircularBuffer<T>` class with fully typed push and shift operations
- O(1) amortized `push` and O(1) `shift` with FIFO ordering
- Automatic capacity growth by doubling when the buffer is full — items are never evicted
- Protected lifecycle hooks (`onGrow`, `onPush`, `onShift`) for subclass observation of buffer events
