export type EventHandlerType<T> = (payload: T) => Promise<void> | void;
