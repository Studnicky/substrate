---
"@studnicky/circular-buffer": major
"@studnicky/fsm": major
---

`CircularBuffer.create` and its protected constructor take `config: unknown`, validated through `CircularBufferOptionsEntity.intake`. The constructor previously took `CircularBufferOptionsEntity.InputType` pre-typed and hand-rolled `capacity <= 0 || !Number.isInteger(capacity)` even though `intake` was already compiled and exported — `capacity`/`overflow` are now actually schema-validated instead of only re-checked by hand for `capacity`.

`InterpreterHistory.create` takes `(config: unknown, collaborators: InterpreterHistoryCollaboratorsInterface = {})` instead of a single pre-typed options object. `capacity` is forwarded unvalidated to `CircularBuffer.create`, which now owns that constraint — `InterpreterHistory`'s own capacity check is gone; a `CircularBufferError` from the composed buffer is caught and rethrown as `FsmConfigError` so the public contract is unchanged. `machineId` is schema-validated via the new `InterpreterHistoryOptionsEntity`, with a message that now reflects the real schema constraint (`/machineId: must NOT have fewer than 1 characters`) rather than a hand-written string. `clock`/`handler`/`machine` are typed collaborators (`machine` still required at runtime). `InterpreterHistoryCreateOptionsInterface` is replaced by `InterpreterHistoryCollaboratorsInterface`.

`EffectInterpreter.create`'s `mailboxCapacity` guard is gone the same way — `MailboxBuffer.createMailbox` now forwards to `CircularBuffer.create`'s real intake, and a caught `CircularBufferError` is rethrown as `FsmConfigError('mailboxCapacity must be a positive integer')`, keeping the existing message and error class stable.
