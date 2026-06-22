export class MachineAlreadyRegisteredError extends Error {
  constructor(name: string) {
    super(`Machine '${name}' is already registered`);
  }
}
