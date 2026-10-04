/** Error data delivered by a browser Worker. */
export interface WebWorkerErrorEventInterface extends Pick<ErrorEvent, 'message'> {}
